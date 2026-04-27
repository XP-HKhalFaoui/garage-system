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

        return or is null ? NotFound() : Ok(or);
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
}
