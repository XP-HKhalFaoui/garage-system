using FluentAssertions;
using GarageSystem.Api.DTOs.Stock;
using GarageSystem.Api.Services;
using GarageSystem.Domain.Entities;
using GarageSystem.Domain.Enums;
using GarageSystem.Domain.Exceptions;
using GarageSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GarageSystem.Tests.Services;

public class StockServiceTests : IDisposable
{
    private readonly ApplicationDbContext _db;
    private readonly StockService _sut;

    public StockServiceTests()
    {
        var opt = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        _db  = new ApplicationDbContext(opt);
        _sut = new StockService(_db);
    }

    private async Task<Article> SeedArticleAsync(decimal stock = 10, decimal min = 5)
    {
        var a = new Article
        {
            Référence   = "ART-001", Désignation = "Filtre à huile",
            Catégorie   = ArticleCategorie.Filtres, Unité = ArticleUnité.Pièce,
            StockActuel = stock, StockMinimum = min,
            PrixAchat   = 500, PrixVente = 800, IsActif = true,
        };
        _db.Articles.Add(a);
        await _db.SaveChangesAsync();
        return a;
    }

    [Fact]
    public async Task CreateAsync_RéférenceUnique_CréeArticle()
    {
        var dto = new CreateArticleDto("REF-NEW", null, "Bougie", null,
            ArticleCategorie.Moteur, null, ArticleUnité.Pièce,
            2, null, 200, 350, null, null);

        var result = await _sut.CreateAsync(dto, "user-1");

        result.Référence.Should().Be("REF-NEW");
        result.StockActuel.Should().Be(0);
    }

    [Fact]
    public async Task CreateAsync_RéférenceDupliquée_LeveConflictException()
    {
        await SeedArticleAsync();
        var dto = new CreateArticleDto("ART-001", null, "Autre", null,
            ArticleCategorie.Filtres, null, ArticleUnité.Pièce,
            2, null, 100, 200, null, null);

        var act = async () => await _sut.CreateAsync(dto, "user-1");
        await act.Should().ThrowAsync<ConflictException>();
    }

    [Fact]
    public async Task AjusterStock_AjoutPositif_MiseAJourStock()
    {
        var a   = await SeedArticleAsync(stock: 10);
        var dto = new AjusterStockDto(5, MouvementStockType.AjustementManuel, "Correction inventaire");

        await _sut.AjusterStockAsync(a.Id, dto, "user-1");

        var updated = await _db.Articles.FindAsync(a.Id);
        updated!.StockActuel.Should().Be(15);
    }

    [Fact]
    public async Task AjusterStock_StockNégatif_LeveException()
    {
        var a   = await SeedArticleAsync(stock: 3);
        var dto = new AjusterStockDto(-10, MouvementStockType.AjustementManuel, "Test");

        var act = async () => await _sut.AjusterStockAsync(a.Id, dto, "user-1");
        await act.Should().ThrowAsync<BusinessRuleException>().WithMessage("*négatif*");
    }

    [Fact]
    public async Task DeleteAsync_StockNonVide_LeveException()
    {
        var a   = await SeedArticleAsync(stock: 5);
        var act = async () => await _sut.DeleteAsync(a.Id);
        await act.Should().ThrowAsync<BusinessRuleException>().WithMessage("*stock*");
    }

    public void Dispose() => _db.Dispose();
}
