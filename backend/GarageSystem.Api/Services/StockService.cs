using GarageSystem.Api.DTOs.Stock;
using GarageSystem.Domain.Entities;
using GarageSystem.Domain.Enums;
using GarageSystem.Domain.Exceptions;
using GarageSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GarageSystem.Api.Services;

public class StockService
{
    private readonly ApplicationDbContext _db;

    public StockService(ApplicationDbContext db) => _db = db;

    // ── Articles CRUD ─────────────────────────────────────────────────────────
    public async Task<PagedResult<ArticleResponseDto>> GetArticlesAsync(
        string? search, ArticleCategorie? categorie,
        bool stockBas, int page, int pageSize, string sort)
    {
        var q = _db.Articles.Where(a => !a.IsDeleted).AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(a => a.Référence.Contains(search) ||
                             a.Désignation.Contains(search) ||
                             (a.RéférenceOEM != null && a.RéférenceOEM.Contains(search)));

        if (categorie.HasValue) q = q.Where(a => a.Catégorie == categorie);
        if (stockBas)           q = q.Where(a => a.StockActuel <= a.StockMinimum);

        q = sort switch
        {
            "prix"      => q.OrderBy(a => a.PrixVente),
            "stock"     => q.OrderBy(a => a.StockActuel),
            "categorie" => q.OrderBy(a => a.Catégorie),
            _           => q.OrderBy(a => a.Désignation),
        };

        var total = await q.CountAsync();
        var items = await q
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(a => ToDto(a))
            .ToListAsync();

        return new PagedResult<ArticleResponseDto>(items, total, page, pageSize);
    }

    public async Task<ArticleResponseDto> GetByIdAsync(Guid id)
    {
        var a = await _db.Articles.FindAsync(id)
            ?? throw new NotFoundException("Article", id);
        return ToDto(a);
    }

    public async Task<ArticleResponseDto> CreateAsync(CreateArticleDto dto, string userId)
    {
        if (await _db.Articles.AnyAsync(a => a.Référence == dto.Référence))
            throw new ConflictException($"La référence '{dto.Référence}' existe déjà.");

        var article = new Article
        {
            Référence            = dto.Référence,
            RéférenceOEM         = dto.RéférenceOEM,
            Désignation          = dto.Désignation,
            Description          = dto.Description,
            Catégorie            = dto.Catégorie,
            MarquesCompatibles   = dto.MarquesCompatibles,
            Unité                = dto.Unité,
            StockActuel          = 0,
            StockMinimum         = dto.StockMinimum,
            StockMaximum         = dto.StockMaximum,
            PrixAchat            = dto.PrixAchat,
            PrixVente            = dto.PrixVente,
            EmplacementRayonnage = dto.EmplacementRayonnage,
            CodeBarre            = dto.CodeBarre,
            IsActif              = true,
        };

        _db.Articles.Add(article);
        await _db.SaveChangesAsync();
        return ToDto(article);
    }

    public async Task<ArticleResponseDto> UpdateAsync(Guid id, UpdateArticleDto dto)
    {
        var a = await _db.Articles.FindAsync(id)
            ?? throw new NotFoundException("Article", id);

        a.Désignation          = dto.Désignation;
        a.Description          = dto.Description;
        a.Catégorie            = dto.Catégorie;
        a.MarquesCompatibles   = dto.MarquesCompatibles;
        a.Unité                = dto.Unité;
        a.StockMinimum         = dto.StockMinimum;
        a.StockMaximum         = dto.StockMaximum;
        a.PrixAchat            = dto.PrixAchat;
        a.PrixVente            = dto.PrixVente;
        a.EmplacementRayonnage = dto.EmplacementRayonnage;
        a.CodeBarre            = dto.CodeBarre;

        await _db.SaveChangesAsync();
        return ToDto(a);
    }

    public async Task DeleteAsync(Guid id)
    {
        var a = await _db.Articles.FindAsync(id)
            ?? throw new NotFoundException("Article", id);

        if (a.StockActuel > 0)
            throw new BusinessRuleException("Impossible de supprimer un article avec du stock.");

        var orActif = await _db.LignesOR
            .AnyAsync(l => l.ArticleId == id &&
                           l.OR.Statut != ORStatut.Livré && l.OR.Statut != ORStatut.Annulé);
        if (orActif)
            throw new BusinessRuleException("Cet article est utilisé dans un OR actif.");

        a.IsDeleted = true;
        a.IsActif   = false;
        await _db.SaveChangesAsync();
    }

    public async Task AjusterStockAsync(Guid id, AjusterStockDto dto, string userId)
    {
        if (dto.Type != MouvementStockType.AjustementManuel && dto.Type != MouvementStockType.Inventaire)
            throw new BusinessRuleException("Seuls les types AjustementManuel et Inventaire sont autorisés ici.");

        var a = await _db.Articles.FindAsync(id)
            ?? throw new NotFoundException("Article", id);

        var avant = a.StockActuel;
        a.StockActuel          += dto.Quantité;
        a.DateDernierMouvement  = DateTime.UtcNow;

        if (a.StockActuel < 0)
            throw new BusinessRuleException("Le stock ne peut pas être négatif.");

        _db.MouvementsStock.Add(new MouvementStock
        {
            ArticleId  = id,
            Type       = dto.Type,
            Quantité   = dto.Quantité,
            StockAvant = avant,
            StockAprès = a.StockActuel,
            Motif      = dto.Motif,
            UserId     = userId,
        });

        await _db.SaveChangesAsync();
    }

    public async Task<List<CategorieStatsDto>> GetCategoriesAsync()
        => await _db.Articles
            .Where(a => !a.IsDeleted && a.IsActif)
            .GroupBy(a => a.Catégorie)
            .Select(g => new CategorieStatsDto(g.Key.ToString(), g.Count()))
            .ToListAsync();

    // ── Bons de réception ─────────────────────────────────────────────────────
    public async Task<BonReceptionResponseDto> CreateBonReceptionAsync(
        CreateBonReceptionDto dto, string userId)
    {
        // Vérifier tous les articles
        var articleIds = dto.Lignes.Select(l => l.ArticleId).Distinct().ToList();
        var articles   = await _db.Articles
            .Where(a => articleIds.Contains(a.Id) && a.IsActif)
            .ToListAsync();

        if (articles.Count != articleIds.Count)
            throw new BusinessRuleException("Un ou plusieurs articles sont introuvables ou inactifs.");

        var numéro = await GenerateBRNuméroAsync();
        var br = new BonReception
        {
            Numéro               = numéro,
            Fournisseur          = dto.Fournisseur,
            RéférenceFournisseur = dto.RéférenceFournisseur,
            DateReception        = dto.DateReception,
            Notes                = dto.Notes,
            UserId               = userId,
        };

        decimal total = 0;
        var lignesResp = new List<LigneBRResponseDto>();

        await using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            _db.BonsReception.Add(br);
            await _db.SaveChangesAsync();

            foreach (var l in dto.Lignes)
            {
                var article = articles.First(a => a.Id == l.ArticleId);
                var avant   = article.StockActuel;

                // Prix moyen pondéré
                if (article.StockActuel > 0)
                    article.PrixAchat = (article.StockActuel * article.PrixAchat + l.QuantiteRecue * l.PrixUnitaireAchat)
                                        / (article.StockActuel + l.QuantiteRecue);

                article.StockActuel          += l.QuantiteRecue;
                article.DateDernierMouvement  = DateTime.UtcNow;

                _db.LignesBonReception.Add(new LigneBonReception
                {
                    BonReceptionId    = br.Id,
                    ArticleId         = l.ArticleId,
                    QuantiteRecue     = l.QuantiteRecue,
                    PrixUnitaireAchat = l.PrixUnitaireAchat,
                    NuméroLot         = l.NuméroLot,
                });

                _db.MouvementsStock.Add(new MouvementStock
                {
                    ArticleId         = l.ArticleId,
                    Type              = MouvementStockType.EntréeBR,
                    Quantité          = l.QuantiteRecue,
                    StockAvant        = avant,
                    StockAprès        = article.StockActuel,
                    RéférenceDocument = numéro,
                    UserId            = userId,
                });

                total += l.QuantiteRecue * l.PrixUnitaireAchat;

                lignesResp.Add(new LigneBRResponseDto(
                    l.ArticleId, article.Référence, article.Désignation,
                    l.QuantiteRecue, l.PrixUnitaireAchat, l.QuantiteRecue * l.PrixUnitaireAchat));
            }

            br.MontantTotal = total;
            await _db.SaveChangesAsync();
            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }

        return new BonReceptionResponseDto(br.Id, numéro, dto.Fournisseur,
            dto.DateReception, total, lignesResp);
    }

    // ── Alertes ───────────────────────────────────────────────────────────────
    public async Task CheckStockAlertsAsync()
    {
        var articlesBasStock = await _db.Articles
            .Where(a => a.IsActif && !a.IsDeleted && a.StockActuel <= a.StockMinimum)
            .ToListAsync();

        foreach (var a in articlesBasStock)
        {
            var alerteExiste = await _db.AlertesStock
                .AnyAsync(al => al.ArticleId == a.Id && al.Statut == "Active");

            if (!alerteExiste)
            {
                _db.AlertesStock.Add(new AlerteStock
                {
                    ArticleId    = a.Id,
                    StockActuel  = a.StockActuel,
                    StockMinimum = a.StockMinimum,
                    Statut       = "Active",
                });
            }
        }
        await _db.SaveChangesAsync();
    }

    public async Task<List<AlerteStockDto>> GetAlertesActivesAsync()
        => await _db.AlertesStock
            .Where(a => a.Statut == "Active")
            .Include(a => a.Article)
            .OrderByDescending(a => a.DateDetection)
            .Select(a => new AlerteStockDto(
                a.Id, a.ArticleId,
                a.Article.Référence, a.Article.Désignation,
                a.StockActuel, a.StockMinimum,
                a.DateDetection, a.Statut))
            .ToListAsync();

    public async Task RésoudreAlerteAsync(Guid id, string commentaire)
    {
        var alerte = await _db.AlertesStock.FindAsync(id)
            ?? throw new NotFoundException("Alerte", id);
        alerte.Statut         = "Résolue";
        alerte.Commentaire    = commentaire;
        alerte.DateResolution = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private static ArticleResponseDto ToDto(Article a) => new(
        a.Id, a.Référence, a.RéférenceOEM, a.Désignation, a.Catégorie,
        a.Unité, a.StockActuel, a.StockMinimum, a.StockMaximum,
        a.PrixAchat, a.PrixVente, a.MargeHT,
        a.EmplacementRayonnage, a.IsActif,
        StockBas: a.StockActuel <= a.StockMinimum,
        a.DateDernierMouvement);

    private async Task<string> GenerateBRNuméroAsync()
    {
        var année = DateTime.UtcNow.Year;
        var count = await _db.BonsReception.CountAsync(b => b.DateCreation.Year == année);
        return $"BR-{année}-{(count + 1):D4}";
    }
}
