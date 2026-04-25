using GarageSystem.Domain.Common;
using GarageSystem.Domain.Enums;

namespace GarageSystem.Domain.Entities;

public class Facture : BaseEntity
{
    public string Numéro { get; set; } = string.Empty;
    public Guid? ORId { get; set; }
    public Guid? DevisId { get; set; }
    // Snapshot client (immuable)
    public string ClientNom { get; set; } = string.Empty;
    public string ClientAdresse { get; set; } = string.Empty;
    public string? ClientNIF { get; set; }
    public DateTime DateFacture { get; set; } = DateTime.UtcNow;
    public DateTime DateEchéance { get; set; }
    public DateTime? DateSolde { get; set; }
    public decimal SousTotalHT { get; set; }
    public decimal MontantTVA { get; set; }
    public decimal TotalTTC { get; set; }
    public decimal MontantDéjàPayé { get; set; }
    public FactureStatut Statut { get; set; } = FactureStatut.Émise;
    public string? MotifsAnnulation { get; set; }

    public ICollection<LigneFacture> Lignes { get; set; } = new List<LigneFacture>();
    public ICollection<Paiement> Paiements { get; set; } = new List<Paiement>();
}

public class LigneFacture : BaseEntity
{
    public Guid FactureId { get; set; }
    public Facture Facture { get; set; } = null!;
    public string Description { get; set; } = string.Empty;
    public decimal Quantité { get; set; }
    public decimal PrixUnitaireHT { get; set; }
    public decimal TauxTVA { get; set; } = 19;
    public decimal TotalHT => Quantité * PrixUnitaireHT;
    public decimal TotalTTC => TotalHT * (1 + TauxTVA / 100);
}

public class Paiement : BaseEntity
{
    public Guid FactureId { get; set; }
    public Facture Facture { get; set; } = null!;
    public decimal Montant { get; set; }
    public ModePaiement ModePaiement { get; set; }
    public string? Référence { get; set; }
    public DateTime DatePaiement { get; set; }
    public string? UserId { get; set; }
}
