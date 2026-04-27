using GarageSystem.Api.Services;
using GarageSystem.Api.Jobs;
using Hangfire;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GarageSystem.Api.Controllers;

[ApiController]
[Route("api/alertes")]
[Authorize]
public class AlertesController : ControllerBase
{
    private readonly StockService _service;

    public AlertesController(StockService service) => _service = service;

    // GET /api/alertes/stock-bas
    [HttpGet("stock-bas")]
    public async Task<IActionResult> GetAlertesStockBas()
        => Ok(await _service.GetAlertesActivesAsync());

    // PATCH /api/alertes/{id}/resoudre
    [HttpPatch("{id:guid}/resoudre")]
    public async Task<IActionResult> Resoudre(Guid id, [FromBody] RésoudreAlerteDto dto)
    {
        await _service.RésoudreAlerteAsync(id, dto.Commentaire);
        return NoContent();
    }

    // POST /api/alertes/check-maintenant (Admin)
    [HttpPost("check-maintenant")]
    [Authorize(Roles = "Admin")]
    public IActionResult CheckMaintenant()
    {
        BackgroundJob.Enqueue<StockAlertJob>(j => j.ExecuteAsync());
        return Accepted(new { message = "Vérification des stocks lancée en arrière-plan." });
    }
}

public record RésoudreAlerteDto(string Commentaire);
