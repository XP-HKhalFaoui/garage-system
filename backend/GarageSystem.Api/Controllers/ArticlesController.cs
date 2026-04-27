using GarageSystem.Api.DTOs.Stock;
using GarageSystem.Api.Services;
using GarageSystem.Domain.Enums;
using GarageSystem.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace GarageSystem.Api.Controllers;

[ApiController]
[Route("api/articles")]
[Authorize]
public class ArticlesController : ControllerBase
{
    private readonly StockService _service;
    private readonly ApplicationDbContext _db;

    public ArticlesController(StockService service, ApplicationDbContext db)
    {
        _service = service;
        _db = db;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    // GET /api/articles
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search,
        [FromQuery] ArticleCategorie? categorie,
        [FromQuery] bool stockBas = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string sort = "designation")
    {
        var result = await _service.GetArticlesAsync(search, categorie, stockBas, page, pageSize, sort);
        return Ok(result);
    }

    // GET /api/articles/categories
    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
        => Ok(await _service.GetCategoriesAsync());

    // GET /api/articles/search
    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string q)
    {
        var results = await _db.Articles
            .Where(a => a.IsActif && !a.IsDeleted &&
                (a.Référence.Contains(q) || a.Désignation.Contains(q) ||
                 (a.RéférenceOEM != null && a.RéférenceOEM.Contains(q))))
            .Take(10)
            .Select(a => new { a.Id, a.Référence, a.Désignation, a.StockActuel, a.PrixVente })
            .ToListAsync();
        return Ok(results);
    }

    // GET /api/articles/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
        => Ok(await _service.GetByIdAsync(id));

    // POST /api/articles
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateArticleDto dto)
    {
        var result = await _service.CreateAsync(dto, UserId);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    // PUT /api/articles/{id}
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateArticleDto dto)
        => Ok(await _service.UpdateAsync(id, dto));

    // PATCH /api/articles/{id}/stock
    [HttpPatch("{id:guid}/stock")]
    public async Task<IActionResult> AjusterStock(Guid id, [FromBody] AjusterStockDto dto)
    {
        await _service.AjusterStockAsync(id, dto, UserId);
        return NoContent();
    }

    // DELETE /api/articles/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }
}
