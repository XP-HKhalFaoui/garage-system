using GarageSystem.Api.DTOs.CRM;
using GarageSystem.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GarageSystem.Api.Controllers;

[ApiController]
[Route("api/clients")]
[Authorize]
public class ClientsController(VehiculeService svc) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? search,
        [FromQuery] string? type,
        [FromQuery] string? wilaya,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var (items, total) = await svc.GetClientsAsync(search, type, wilaya, page, pageSize);
        return Ok(new { items, total, page, pageSize });
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string q = "")
        => Ok(await svc.SearchClientsAsync(q));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
        => Ok(await svc.GetClientByIdAsync(id));

    [HttpGet("{id:guid}/vehicules")]
    public async Task<IActionResult> GetVehicules(Guid id)
        => Ok(await svc.GetVehiculesByClientAsync(id));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateClientDto dto)
    {
        var result = await svc.CreateClientAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateClientDto dto)
        => Ok(await svc.UpdateClientAsync(id, dto));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await svc.DeleteClientAsync(id);
        return NoContent();
    }
}
