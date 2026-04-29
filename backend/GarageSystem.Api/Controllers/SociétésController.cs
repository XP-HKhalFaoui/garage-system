using GarageSystem.Api.DTOs.Fleet;
using GarageSystem.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GarageSystem.Api.Controllers;

[ApiController]
[Route("api/societes")]
[Authorize]
public class SociétésController(FleetService svc) : ControllerBase
{
    // ── Sociétés ──────────────────────────────────────────────────────────────

    // GET /api/societes?actif=true
    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] bool? actif)
        => Ok(await svc.GetSociétésAsync(actif));

    // GET /api/societes/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
        => Ok(await svc.GetSociétéAsync(id));

    // POST /api/societes
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateSociétéDto dto)
    {
        var result = await svc.CreateSociétéAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    // PUT /api/societes/{id}
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateSociétéDto dto)
        => Ok(await svc.UpdateSociétéAsync(id, dto));

    // PATCH /api/societes/{id}/desactiver
    [HttpPatch("{id:guid}/desactiver")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Désactiver(Guid id)
    {
        await svc.DésactiverSociétéAsync(id);
        return NoContent();
    }

    // ── Contrats ──────────────────────────────────────────────────────────────

    // GET /api/societes/{id}/contrats
    [HttpGet("{id:guid}/contrats")]
    public async Task<IActionResult> GetContrats(Guid id)
        => Ok(await svc.GetContratsAsync(id));

    // GET /api/societes/{id}/contrat-actif
    [HttpGet("{id:guid}/contrat-actif")]
    public async Task<IActionResult> GetContratActif(Guid id)
        => Ok(await svc.GetContratActifAsync(id));

    // POST /api/societes/{id}/contrats
    [HttpPost("{id:guid}/contrats")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CréerContrat(Guid id, [FromBody] CreateContratDto dto)
    {
        var result = await svc.CréerContratAsync(id, dto);
        return Created($"/api/societes/{id}/contrats/{result.Id}", result);
    }

    // ── Flotte ────────────────────────────────────────────────────────────────

    // GET /api/societes/{id}/flotte
    [HttpGet("{id:guid}/flotte")]
    public async Task<IActionResult> GetFlotte(Guid id)
        => Ok(await svc.GetFlotteAsync(id));

    // POST /api/societes/{id}/flotte
    [HttpPost("{id:guid}/flotte")]
    public async Task<IActionResult> AffecterVéhicule(Guid id, [FromBody] AffecterVéhiculeDto dto)
    {
        var result = await svc.AffecterVéhiculeAsync(id, dto);
        return Created($"/api/societes/{id}/flotte/{result.VéhiculeId}", result);
    }

    // DELETE /api/societes/{id}/flotte/{vehiculeId}
    [HttpDelete("{id:guid}/flotte/{véhiculeId:guid}")]
    public async Task<IActionResult> RetirerVéhicule(Guid id, Guid véhiculeId)
    {
        await svc.RetirerVéhiculeAsync(id, véhiculeId);
        return NoContent();
    }

    // GET /api/societes/{id}/or-du-mois?mois=11&annee=2024
    [HttpGet("{id:guid}/or-du-mois")]
    public async Task<IActionResult> GetORDuMois(
        Guid id,
        [FromQuery] int mois,
        [FromQuery] int annee)
        => Ok(await svc.GetORDuMoisAsync(id, mois, annee));

    // ── Facturation groupée ───────────────────────────────────────────────────

    // GET /api/societes/{id}/facture-mensuelle/preview?mois=11&annee=2024
    [HttpGet("{id:guid}/facture-mensuelle/preview")]
    public async Task<IActionResult> Preview(
        Guid id, [FromQuery] int mois, [FromQuery] int annee)
        => Ok(await svc.PreviewFactureGroupéeAsync(id, mois, annee));

    // POST /api/societes/{id}/facture-mensuelle
    [HttpPost("{id:guid}/facture-mensuelle")]
    [Authorize(Roles = "Admin,Caissier")]
    public async Task<IActionResult> CréerFactureMensuelle(
        Guid id, [FromBody] CréerFactureGroupéeDto dto)
    {
        var result = await svc.CréerFactureGroupéeAsync(id, dto);
        return Created($"/api/societes/{id}/historique-factures/{result.Id}", result);
    }

    // GET /api/societes/{id}/historique-factures?page=1&pageSize=20
    [HttpGet("{id:guid}/historique-factures")]
    public async Task<IActionResult> GetHistoriqueFactures(
        Guid id,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
        => Ok(await svc.GetHistoriqueFacturesGroupéesAsync(id, page, pageSize));

    // GET /api/societes/factures-groupees/{factureId}
    [HttpGet("factures-groupees/{factureId:guid}")]
    public async Task<IActionResult> GetFactureGroupée(Guid factureId)
        => Ok(await svc.GetFactureGroupéeDetailAsync(factureId));
}
