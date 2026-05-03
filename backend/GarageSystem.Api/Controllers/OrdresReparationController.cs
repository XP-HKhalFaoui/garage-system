using GarageSystem.Api.DTOs.OR;
using GarageSystem.Api.Services;
using GarageSystem.Domain.Enums;
using GarageSystem.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace GarageSystem.Api.Controllers;

[ApiController]
[Route("api/ordres-reparation")]
[Authorize]
public class OrdresReparationController : ControllerBase
{
    private readonly OrdreReparationService _service;
    private readonly ApplicationDbContext   _db;

    public OrdresReparationController(OrdreReparationService service, ApplicationDbContext db)
    {
        _service = service;
        _db      = db;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    // GET /api/ordres-reparation?actif=true&today=true&statut=EnCours&technicienId=...
    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] bool?      today,
        [FromQuery] bool?      actif,
        [FromQuery] ORStatut?  statut,
        [FromQuery] Guid?      technicienId)
    {
        if (today == true)
        {
            var result = await _service.GetTodayAsync(statut, technicienId);
            return Ok(result);
        }

        // actif=true → tous les OR non terminaux (toutes dates confondues)
        var query = _db.OrdresReparation
            .Include(o => o.Vehicule).ThenInclude(v => v.Client)
            .Include(o => o.Technicien)
            .Include(o => o.Lignes)
            .AsNoTracking();

        if (actif == true)
            query = query.Where(o =>
                o.Statut != ORStatut.Livré &&
                o.Statut != ORStatut.Annulé);

        if (statut.HasValue)       query = query.Where(o => o.Statut == statut.Value);
        if (technicienId.HasValue) query = query.Where(o => o.TechnicienId == technicienId.Value);

        var ors = await query
            .OrderByDescending(o => o.DateOuverture)
            .Take(100)
            .ToListAsync();

        var dtos = ors.Select(o => new ORSummaryDto(
            o.Id,
            o.Numéro,
            o.Statut,
            o.Priorité,
            o.DateOuverture.ToString("HH:mm"),
            new VehiculeInfoDto(o.Vehicule.Id, o.Vehicule.Immatriculation,
                o.Vehicule.Marque, o.Vehicule.Modele, o.Vehicule.KilométrageActuel),
            new ClientInfoDto(o.Vehicule.Client.Id, o.Vehicule.Client.Nom, o.Vehicule.Client.Téléphone),
            o.Technicien == null ? null :
                new TechnicienInfoDto(o.Technicien.Id, o.Technicien.Nom, o.Technicien.Prénom),
            o.Lignes.Count,
            o.MontantTotal
        ));

        return Ok(dtos);
    }

    // POST /api/ordres-reparation
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateORDto dto)
    {
        var result = await _service.CreateAsync(dto, UserId);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    // GET /api/ordres-reparation/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var or = await _db.OrdresReparation
            .Include(o => o.Vehicule).ThenInclude(v => v.Client)
            .Include(o => o.Technicien)
            .Include(o => o.Lignes).ThenInclude(l => l.Article)
            .Include(o => o.HistoriqueStatuts)
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == id);

        if (or is null) return NotFound();

        var dto = new ORDetailDto(
            or.Id, or.Numéro, or.Statut, or.Priorité, or.TypeIntervention,
            or.DateOuverture, or.DateFermeture, or.HeureDebut, or.Diagnostic, or.MontantTotal,
            or.FactureId,
            new VehiculeInfoDto(or.Vehicule.Id, or.Vehicule.Immatriculation,
                or.Vehicule.Marque, or.Vehicule.Modele, or.Vehicule.KilométrageActuel),
            new ClientInfoDto(or.Vehicule.Client.Id, or.Vehicule.Client.Nom, or.Vehicule.Client.Téléphone),
            or.Technicien is null ? null :
                new TechnicienInfoDto(or.Technicien.Id, or.Technicien.Nom, or.Technicien.Prénom),
            or.Lignes
                .OrderBy(l => l.DateCreation)
                .Select(l => new LigneORResponseDto(
                    l.Id, l.Type, l.ArticleId,
                    l.Article?.Référence,
                    l.Description, l.Quantité, l.PrixUnitaire, l.Quantité * l.PrixUnitaire))
                .ToList(),
            or.HistoriqueStatuts
                .OrderBy(h => h.Timestamp)
                .Select(h => new HistoriqueStatutDto(h.Id, h.StatutAvant, h.StatutAprès, h.Commentaire, h.Timestamp))
                .ToList()
        );

        return Ok(dto);
    }

    // GET /api/ordres-reparation/today
    [HttpGet("today")]
    public async Task<IActionResult> GetToday(
        [FromQuery] ORStatut? statut,
        [FromQuery] Guid?     technicienId)
    {
        var result = await _service.GetTodayAsync(statut, technicienId);
        return Ok(result);
    }

    // GET /api/ordres-reparation/stats-today
    [HttpGet("stats-today")]
    public async Task<IActionResult> StatsToday()
    {
        var stats = await _service.GetStatsTodayAsync();
        return Ok(stats);
    }

    // PATCH /api/ordres-reparation/{id}/assigner
    [HttpPatch("{id:guid}/assigner")]
    public async Task<IActionResult> Assigner(Guid id, [FromBody] AssignerTechnicienDto dto)
    {
        await _service.AssignerTechnicienAsync(id, dto.TechnicienId, UserId);
        return NoContent();
    }

    // PATCH /api/ordres-reparation/{id}/statut
    [HttpPatch("{id:guid}/statut")]
    public async Task<IActionResult> ChangerStatut(Guid id, [FromBody] ChangerStatutDto dto)
    {
        await _service.ChangerStatutAsync(id, dto, UserId);
        return NoContent();
    }

    // POST /api/ordres-reparation/{id}/lignes
    [HttpPost("{id:guid}/lignes")]
    public async Task<IActionResult> AddLigne(Guid id, [FromBody] AddLigneORDto dto)
    {
        var ligne = await _service.AddLigneAsync(id, dto, UserId);
        return Created($"/api/ordres-reparation/{id}/lignes/{ligne.Id}", ligne);
    }

    // GET /api/ordres-reparation/{id}/lignes
    [HttpGet("{id:guid}/lignes")]
    public async Task<IActionResult> GetLignes(Guid id)
    {
        var lignes = await _db.LignesOR
            .Where(l => l.ORId == id)
            .Include(l => l.Article)
            .AsNoTracking()
            .Select(l => new LigneORResponseDto(
                l.Id, l.Type, l.ArticleId,
                l.Article != null ? l.Article.Référence : null,
                l.Description, l.Quantité, l.PrixUnitaire, l.Quantité * l.PrixUnitaire))
            .ToListAsync();

        return Ok(lignes);
    }

    // DELETE /api/ordres-reparation/{id}/lignes/{ligneId}
    [HttpDelete("{id:guid}/lignes/{ligneId:guid}")]
    public async Task<IActionResult> RemoveLigne(Guid id, Guid ligneId)
    {
        await _service.RemoveLigneAsync(id, ligneId, UserId);
        return NoContent();
    }

    // GET /api/ordres-reparation/planning?debut=2025-05-01&fin=2025-05-07
    [HttpGet("planning")]
    public async Task<IActionResult> GetPlanning(
        [FromQuery] DateTime debut,
        [FromQuery] DateTime fin)
    {
        var ors = await _db.OrdresReparation
            .Include(o => o.Vehicule)
            .Include(o => o.Technicien)
            .Where(o => o.Statut != ORStatut.Livré
                && o.Statut != ORStatut.Annulé
                && o.HeureDebut != null
                && o.HeureDebut >= debut
                && o.HeureDebut < fin.AddDays(1))
            .AsNoTracking()
            .ToListAsync();

        var planifiésDtos = ors.Select(o => new PlanningORDto(
            o.Id, o.Numéro, o.Statut, o.Priorité, o.TypeIntervention,
            o.HeureDebut!.Value, o.HeureFin,
            o.TechnicienId,
            o.Technicien == null ? null : o.Technicien.Nom + " " + o.Technicien.Prénom,
            o.Vehicule.Immatriculation, o.Vehicule.Marque, o.Vehicule.Modele
        )).ToList();

        var nonPlanifiésRaw = await _db.OrdresReparation
            .Include(o => o.Vehicule)
            .Where(o => o.Statut == ORStatut.EnAttente && o.HeureDebut == null)
            .AsNoTracking()
            .ToListAsync();

        var nonPlanifiés = nonPlanifiésRaw.Select(o => new PlanningORDto(
            o.Id, o.Numéro, o.Statut, o.Priorité, o.TypeIntervention,
            DateTime.MinValue, null, null, null,
            o.Vehicule.Immatriculation, o.Vehicule.Marque, o.Vehicule.Modele
        )).ToList();

        return Ok(new { planifiés = planifiésDtos, nonPlanifiés });
    }

    // PATCH /api/ordres-reparation/{id}/replanifier
    [HttpPatch("{id:guid}/replanifier")]
    public async Task<IActionResult> Replanifier(Guid id, [FromBody] ReplanifierORDto dto)
    {
        var or = await _db.OrdresReparation.FindAsync(id);
        if (or is null) return NotFound();

        // Détection conflit pour le même technicien
        if (dto.TechnicienId.HasValue && dto.HeureFin.HasValue)
        {
            var conflit = await _db.OrdresReparation.AnyAsync(o =>
                o.Id != id
                && o.TechnicienId == dto.TechnicienId
                && o.HeureDebut != null
                && o.HeureFin != null
                && o.HeureDebut < dto.HeureFin
                && o.HeureFin > dto.HeureDebut);

            if (conflit)
                return Conflict(new { title = "Conflit de planning détecté pour ce technicien", status = 409 });
        }

        or.TechnicienId = dto.TechnicienId ?? or.TechnicienId;
        or.HeureDebut = dto.HeureDebut;
        or.HeureFin = dto.HeureFin;

        await _db.SaveChangesAsync();
        return NoContent();
    }
}
