using GarageSystem.Api.DTOs.CRM;
using GarageSystem.Api.Jobs;
using GarageSystem.Api.Services;
using Hangfire;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GarageSystem.Api.Controllers;

[ApiController]
[Route("api/offres")]
[Authorize]
public class OffresController(OffresService svc) : ControllerBase
{
    [HttpGet("a-envoyer")]
    public async Task<IActionResult> GetAEnvoyer(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
        => Ok(await svc.GetVehiculesAvecOffresAsync(page, pageSize));

    [HttpPost("envoyer")]
    public async Task<IActionResult> Envoyer([FromBody] EnvoyerOffresDto dto)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "";
        return Ok(await svc.EnvoyerAsync(dto, userId));
    }

    [HttpPatch("{id:guid}/statut")]
    public async Task<IActionResult> ChangerStatut(Guid id, [FromBody] ChangerStatutOffreDto dto)
    {
        await svc.ChangerStatutAsync(id, dto.Statut);
        return NoContent();
    }

    [HttpGet("vehicule/{vehiculeId:guid}")]
    public async Task<IActionResult> GetOffresVehicule(Guid vehiculeId)
        => Ok(await svc.GetOffresVehiculeAsync(vehiculeId));

    [HttpPost("scan-maintenant")]
    [Authorize(Roles = "Admin")]
    public IActionResult ScanMaintenant()
    {
        BackgroundJob.Enqueue<OffresScanJob>(j => j.ExecuteAsync());
        return Accepted(new { message = "Scan déclenché." });
    }
}
