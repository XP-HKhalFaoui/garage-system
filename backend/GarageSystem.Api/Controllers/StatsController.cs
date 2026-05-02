using GarageSystem.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GarageSystem.Api.Controllers;

[ApiController]
[Route("api/stats")]
[Authorize(Roles = "Admin,RH")]
public class StatsController(StatsService svc) : ControllerBase
{
    [HttpGet("dashboard")]
    [Authorize] // tous rôles
    public async Task<IActionResult> Dashboard()
        => Ok(await svc.GetDashboardAsync());

    [HttpGet("ca-mensuel")]
    public async Task<IActionResult> CaMensuel([FromQuery] int nbMois = 12)
        => Ok(await svc.GetCaMensuelAsync(nbMois));

    [HttpGet("techniciens")]
    public async Task<IActionResult> Techniciens([FromQuery] int? annee, [FromQuery] int? mois)
        => Ok(await svc.GetStatsTechniciensAsync(annee, mois));

    [HttpGet("stock-rotation")]
    public async Task<IActionResult> StockRotation()
        => Ok(await svc.GetStatsStockAsync());

    /// <summary>Mobile — récap de la journée en cours.</summary>
    [HttpGet("recap-journee")]
    [Authorize] // tous rôles (technicien mobile inclus)
    public async Task<IActionResult> RecapJournee()
        => Ok(await svc.GetRecapJourneeAsync());
}
