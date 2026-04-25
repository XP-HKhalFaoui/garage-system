using GarageSystem.Domain.Common;
using GarageSystem.Domain.Enums;

namespace GarageSystem.Domain.Entities;

public class Devis : BaseEntity
{
    public string Numéro { get; set; } = string.Empty;
    public Guid ORId { get; set; }
    public Guid ClientId { get; set; }
    public DevisStatut Statut { get; set; } = DevisStatut.Brouillon;
    public DateTime DateExpiration { get; set; }
    public DateTime? DateEnvoi { get; set; }
    public string? MotifRefus { get; set; }
    public decimal SousTotalHT { get; set; }
    public decimal MontantTVA { get; set; }
    public decimal TotalTTC { get; set; }

    public ICollection<LigneDevis> Lignes { get; set; } = new List<LigneDevis>();
}

public class LigneDevis : BaseEntity
{
    public Guid DevisId { get; set; }
    public Devis Devis { get; set; } = null!;
    public string Description { get; set; } = string.Empty;
    public decimal Quantité { get; set; }
    public decimal PrixUnitaireHT { get; set; }
    public decimal TauxTVA { get; set; } = 19;
}
