using GarageSystem.Domain.Common;

namespace GarageSystem.Domain.Entities;

public class BonReception : BaseEntity
{
    public string Numéro { get; set; } = string.Empty;
    public string Fournisseur { get; set; } = string.Empty;
    public string? RéférenceFournisseur { get; set; }
    public DateTime DateReception { get; set; }
    public string? Notes { get; set; }
    public decimal MontantTotal { get; set; }
    public string? UserId { get; set; }

    public ICollection<LigneBonReception> Lignes { get; set; } = new List<LigneBonReception>();
}

public class LigneBonReception : BaseEntity
{
    public Guid BonReceptionId { get; set; }
    public BonReception BonReception { get; set; } = null!;
    public Guid ArticleId { get; set; }
    public Article Article { get; set; } = null!;
    public decimal QuantiteRecue { get; set; }
    public decimal PrixUnitaireAchat { get; set; }
    public string? NuméroLot { get; set; }
}

public class AlerteStock : BaseEntity
{
    public Guid ArticleId { get; set; }
    public Article Article { get; set; } = null!;
    public decimal StockActuel { get; set; }
    public decimal StockMinimum { get; set; }
    public DateTime DateDetection { get; set; } = DateTime.UtcNow;
    public string Statut { get; set; } = "Active"; // Active | Résolue
    public string? Commentaire { get; set; }
    public DateTime? DateResolution { get; set; }
}
