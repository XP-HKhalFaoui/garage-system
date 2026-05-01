using GarageSystem.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GarageSystem.Api.Controllers;

[ApiController]
[Route("api/comptabilite")]
[Authorize(Roles = "Admin,RH")]
public class ComptabiliteController : ControllerBase
{
    private readonly ComptabiliteExportService _service;

    public ComptabiliteController(ComptabiliteExportService service) => _service = service;

    // GET /api/comptabilite/export?mois=2025-05&format=xlsx
    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] string mois, [FromQuery] string format = "xlsx")
    {
        if (!DateTime.TryParseExact(mois, "yyyy-MM",
            System.Globalization.CultureInfo.InvariantCulture,
            System.Globalization.DateTimeStyles.None,
            out var date))
        {
            return BadRequest(new { title = "Format mois invalide, utilisez yyyy-MM", status = 400 });
        }

        var écritures = await _service.GetEcrituresAsync(date.Year, date.Month);

        if (format.ToLower() == "csv")
        {
            var csv = _service.ExportToCsv(écritures);
            var bytes = System.Text.Encoding.UTF8.GetBytes(csv);
            return File(bytes, "text/csv", $"grand-livre-{mois}.csv");
        }
        else
        {
            var xlsx = _service.ExportToExcel(écritures, date.Year, date.Month);
            return File(xlsx, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                $"grand-livre-{mois}.xlsx");
        }
    }
}
