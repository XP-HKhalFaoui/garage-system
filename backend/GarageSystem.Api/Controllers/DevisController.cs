using GarageSystem.Api.DTOs.Billing;
using GarageSystem.Api.Services;
using GarageSystem.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GarageSystem.Api.Controllers;

[ApiController]
[Route("api/devis")]
[Authorize]
public class DevisController(BillingService svc, PdfService pdf) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] Guid? orId,
        [FromQuery] Guid? clientId,
        [FromQuery] DevisStatut? statut,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
        => Ok(await svc.GetDevisListAsync(orId, clientId, statut, page, pageSize));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
        => Ok(await svc.GetDevisAsync(id));

    [HttpPost("depuis-or/{orId:guid}")]
    public async Task<IActionResult> CreateFromOR(Guid orId)
    {
        var result = await svc.CreateDevisFromORAsync(orId);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPatch("{id:guid}/valider")]
    public async Task<IActionResult> Valider(Guid id)
        => Ok(await svc.ValiderDevisAsync(id));

    [HttpPatch("{id:guid}/envoyer")]
    public async Task<IActionResult> Envoyer(Guid id)
        => Ok(await svc.EnvoyerDevisAsync(id));

    [HttpPatch("{id:guid}/accepter")]
    public async Task<IActionResult> Accepter(Guid id)
        => Ok(await svc.AccepterDevisAsync(id));

    [HttpPatch("{id:guid}/refuser")]
    public async Task<IActionResult> Refuser(Guid id, [FromBody] RefuserDevisDto dto)
        => Ok(await svc.RefuserDevisAsync(id, dto.Motif));

    [HttpGet("{id:guid}/pdf")]
    public async Task<IActionResult> GetPdf(Guid id)
    {
        var (devis, clientNom, clientAdresse, clientNIF) = await svc.GetDevisPdfDataAsync(id);
        var bytes = pdf.GenerateDevisPdf(devis, clientNom, clientAdresse, clientNIF);
        return File(bytes, "application/pdf", $"{devis.Numéro}.pdf");
    }
}
