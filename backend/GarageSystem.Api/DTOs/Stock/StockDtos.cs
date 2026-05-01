using GarageSystem.Domain.Enums;

namespace GarageSystem.Api.DTOs.Stock;

// ── Articles ──────────────────────────────────────────────────────────────────
public record CreateArticleDto(
    string Référence,
    string? RéférenceOEM,
    string Désignation,
    string? Description,
    ArticleCategorie Catégorie,
    string? MarquesCompatibles,
    ArticleUnité Unité,
    decimal StockMinimum,
    decimal? StockMaximum,
    decimal PrixAchat,
    decimal PrixVente,
    string? EmplacementRayonnage,
    string? CodeBarre
);

public record UpdateArticleDto(
    string Désignation,
    string? Description,
    ArticleCategorie Catégorie,
    string? MarquesCompatibles,
    ArticleUnité Unité,
    decimal StockMinimum,
    decimal? StockMaximum,
    decimal PrixAchat,
    decimal PrixVente,
    string? EmplacementRayonnage,
    string? CodeBarre
);

public record AjusterStockDto(
    decimal Quantité,
    MouvementStockType Type,
    string Motif
);

public record ArticleResponseDto(
    Guid Id,
    string Référence,
    string? RéférenceOEM,
    string Désignation,
    ArticleCategorie Catégorie,
    ArticleUnité Unité,
    decimal StockActuel,
    decimal StockMinimum,
    decimal? StockMaximum,
    decimal PrixAchat,
    decimal PrixVente,
    decimal MargeHT,
    string? EmplacementRayonnage,
    bool IsActif,
    bool StockBas,
    DateTime? DateDernierMouvement
);

public record CategorieStatsDto(string Nom, int Count);

public record PagedResult<T>(List<T> Items, int Total, int Page, int PageSize);

// ── Bons de réception ─────────────────────────────────────────────────────────
public record CreateBonReceptionDto(
    string Fournisseur,
    string? RéférenceFournisseur,
    DateTime DateReception,
    string? Notes,
    List<LigneBonReceptionDto> Lignes
);

public record LigneBonReceptionDto(
    Guid ArticleId,
    decimal QuantiteRecue,
    decimal PrixUnitaireAchat,
    string? NuméroLot
);

public record BonReceptionResponseDto(
    Guid Id,
    string Numéro,
    string Fournisseur,
    DateTime DateReception,
    decimal MontantTotal,
    List<LigneBRResponseDto> Lignes
);

public record LigneBRResponseDto(
    Guid ArticleId,
    string ArticleRéférence,
    string ArticleDésignation,
    decimal QuantiteRecue,
    decimal PrixUnitaireAchat,
    decimal Total
);

// ── Import CSV ────────────────────────────────────────────────────────────────
public record ImportCsvResultDto(
    int Total,
    int Créés,
    int MisÀJour,
    double DuréeMs,
    List<ImportCsvErreurDto> Erreurs
);

public record ImportCsvErreurDto(int Ligne, string Référence, string Message);

// ── Alertes stock ─────────────────────────────────────────────────────────────
public record AlerteStockDto(
    Guid Id,
    Guid ArticleId,
    string ArticleRéférence,
    string ArticleDésignation,
    decimal StockActuel,
    decimal StockMinimum,
    DateTime DateDetection,
    string Statut
);
