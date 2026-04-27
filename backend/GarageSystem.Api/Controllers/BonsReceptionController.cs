using GarageSystem.Api.DTOs.Stock;
using GarageSystem.Api.Services;
using GarageSystem.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace GarageSystem.Api.Controllers;

[ApiController]
[Route("api/bons-reception")]
[Authorize]
public class BonsReceptionController : ControllerBase
{
    private readonly StockService _service;
    private readonly ApplicationDbContext _db;

    public BonsReceptionController(StockService service, ApplicationDbContext db)
    {
        _service = service;
        _db = db;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    // POST /api/bons-reception
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateBonReceptionDto dto)
    {
        var result = await _service.CreateBonReceptionAsync(dto, UserId);
        return Created($"/api/bons-reception/{result.Id}", result);
    }

    // GET /api/bons-reception
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo,
        [FromQuery] string? fournisseur,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var q = _db.BonsReception.AsQueryable();
        if (dateFrom.HasValue)                  q = q.Where(b => b.DateReception >= dateFrom);
        if (dateTo.HasValue)                    q = q.Where(b => b.DateReception <= dateTo);
        if (!string.IsNullOrEmpty(fournisseur)) q = q.Where(b => b.Fournisseur.Contains(fournisseur));

        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(b => b.DateReception)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(b => new { b.Id, b.Numéro, b.Fournisseur, b.DateReception, b.MontantTotal })
            .ToListAsync();

        return Ok(new { items, total, page, pageSize });
    }

    // GET /api/bons-reception/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var br = await _db.BonsReception
            .Include(b => b.Lignes).ThenInclude(l => l.Article)
            .FirstOrDefaultAsync(b => b.Id == id);
        return br is null ? NotFound() : Ok(br);
    }
}
