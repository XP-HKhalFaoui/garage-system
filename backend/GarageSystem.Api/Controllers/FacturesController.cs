using GarageSystem.Api.DTOs.Billing;
using GarageSystem.Api.Services;
using GarageSystem.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GarageSystem.Api.Controllers;

[ApiController]
[Route("api/factures")]
[Authorize]
public class FacturesController(BillingService svc, PdfService pdf) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] FactureStatut? statut,
        [FromQuery] Guid? clientId,
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var (items, total) = await svc.GetFacturesListAsync(statut, clientId, dateFrom, dateTo, page, pageSize);
        return Ok(new { items, total, page, pageSize });
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
        => Ok(await svc.GetStatsBillingAsync());

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
        => Ok(await svc.GetFactureAsync(id));

    [HttpPost("depuis-or/{orId:guid}")]
    public async Task<IActionResult> CreateFromOR(Guid orId)
    {
        var result = await svc.CreateFactureFromORAsync(orId);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPost("depuis-devis/{devisId:guid}")]
    public async Task<IActionResult> CreateFromDevis(Guid devisId)
    {
        var result = await svc.CreateFactureFromDevisAsync(devisId);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPost("{id:guid}/paiements")]
    public async Task<IActionResult> EnregistrerPaiement(Guid id, [FromBody] EnregistrerPaiementDto dto)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "";
        return Ok(await svc.EnregistrerPaiementAsync(id, dto, userId));
    }

    [HttpGet("{id:guid}/paiements")]
    public async Task<IActionResult> GetPaiements(Guid id)
        => Ok(await svc.GetPaiementsAsync(id));

    [HttpPatch("{id:guid}/annuler")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Annuler(Guid id, [FromBody] AnnulerFactureDto dto)
    {
        await svc.AnnulerFactureAsync(id, dto.Motif);
        return NoContent();
    }

    [HttpGet("{id:guid}/pdf")]
    public async Task<IActionResult> GetPdf(Guid id)
    {
        var (facture, immat) = await svc.GetFacturePdfDataAsync(id);
        var bytes = pdf.GenerateFacturePdf(facture, immat);
        return File(bytes, "application/pdf", $"{facture.Numéro}.pdf");
    }
}

[ApiController]
[Route("api/caisse")]
[Authorize(Roles = "Admin,Caissier")]
public class CaisseController(BillingService svc) : ControllerBase
{
    [HttpGet("recap-jour")]
    public async Task<IActionResult> GetRecapJour()
        => Ok(await svc.GetRecapCaisseAsync());
}
