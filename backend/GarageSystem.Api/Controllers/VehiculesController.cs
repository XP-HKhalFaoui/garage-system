using GarageSystem.Api.DTOs.CRM;
using GarageSystem.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GarageSystem.Api.Controllers;

[ApiController]
[Route("api/vehicules")]
[Authorize]
public class VehiculesController(VehiculeService svc) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? search,
        [FromQuery] string? marque,
        [FromQuery] string? carburant,
        [FromQuery] Guid? clientId,
        [FromQuery] bool? avecEntretienDu,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var (items, total) = await svc.GetListAsync(search, marque, carburant, clientId, avecEntretienDu, page, pageSize);
        return Ok(new { items, total, page, pageSize });
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string q = "")
        => Ok(await svc.SearchAsync(q));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
        => Ok(await svc.GetByIdAsync(id));

    [HttpGet("{id:guid}/historique")]
    public async Task<IActionResult> GetHistorique(Guid id)
        => Ok(await svc.GetHistoriqueAsync(id));

    [HttpGet("{id:guid}/prochain-entretien")]
    public async Task<IActionResult> GetProchainEntretien(Guid id)
        => Ok(await svc.GetProchainEntretienAsync(id));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateVehiculeDto dto)
    {
        var result = await svc.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateVehiculeDto dto)
        => Ok(await svc.UpdateAsync(id, dto));

    [HttpPatch("{id:guid}/kilometrage")]
    public async Task<IActionResult> MajKilométrage(Guid id, [FromBody] MajKilométrageDto dto)
    {
        await svc.MajKilométrageAsync(id, dto.Km);
        return NoContent();
    }
}
