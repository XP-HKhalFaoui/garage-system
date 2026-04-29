using GarageSystem.Domain.Common;
using GarageSystem.Domain.Enums;

namespace GarageSystem.Domain.Entities;

// ── Société abonnée ────────────────────────────────────────────────────────────
public class Société : SoftDeleteEntity
{
    public string RaisonSociale { get; set; } = string.Empty;
    public string NRC { get; set; } = string.Empty;          // Numéro Registre Commerce
    public string NIF { get; set; } = string.Empty;
    public string AdresseSiège { get; set; } = string.Empty;
    public string TéléphoneRespAchats { get; set; } = string.Empty;
    public string EmailFacturation { get; set; } = string.Empty;
    public bool IsActif { get; set; } = true;

    public ICollection<Contrat> Contrats { get; set; } = new List<Contrat>();
    public ICollection<VéhiculeSociété> VéhiculesSociété { get; set; } = new List<VéhiculeSociété>();
    public ICollection<FactureGroupée> FacturesGroupées { get; set; } = new List<FactureGroupée>();
}

// ── Contrat tarifaire ──────────────────────────────────────────────────────────
public class Contrat : BaseEntity
{
    public Guid SociétéId { get; set; }
    public Société Société { get; set; } = null!;
    public DateTime DateDébut { get; set; }
    public DateTime? DateFin { get; set; }
    public TypeTarif TypeTarif { get; set; } = TypeTarif.TarifNormal;
    public decimal? PlafondMensuelDZD { get; set; }
    public decimal? RemisePourcentage { get; set; }          // 0–100
    public string? ConditionsParticulières { get; set; }
    public bool IsActif { get; set; } = true;
}

// ── Véhicule affecté à une société ────────────────────────────────────────────
public class VéhiculeSociété : BaseEntity
{
    public Guid SociétéId { get; set; }
    public Société Société { get; set; } = null!;
    public Guid VéhiculeId { get; set; }
    public Vehicule Vehicule { get; set; } = null!;
    public string? NuméroFlotte { get; set; }
    public string? ConducteurHabituel { get; set; }
    public DateTime DateAffectation { get; set; } = DateTime.UtcNow;
    public DateTime? DateRetrait { get; set; }
    public bool IsActif { get; set; } = true;
}

// ── Facture groupée mensuelle ──────────────────────────────────────────────────
public class FactureGroupée : BaseEntity
{
    public string Numéro { get; set; } = string.Empty;
    public Guid SociétéId { get; set; }
    public Société Société { get; set; } = null!;

    // Snapshot société (immuable)
    public string SociétéRaisonSociale { get; set; } = string.Empty;
    public string SociétéNIF { get; set; } = string.Empty;
    public string SociétéAdresse { get; set; } = string.Empty;

    public int PériodeMois { get; set; }    // 1–12
    public int PériodeAnnée { get; set; }

    public decimal SousTotalHT { get; set; }
    public decimal MontantTVA { get; set; }
    public decimal TotalTTC { get; set; }
    public bool DépassementPlafond { get; set; }
    public FactureGroupéeStatut Statut { get; set; } = FactureGroupéeStatut.Émise;
    public DateTime DateFacture { get; set; } = DateTime.UtcNow;
    public string? MotifsAnnulation { get; set; }

    public ICollection<LigneFactureGroupée> Lignes { get; set; } = new List<LigneFactureGroupée>();
}

// ── Ligne de facture groupée (regroupée par véhicule) ─────────────────────────
public class LigneFactureGroupée : BaseEntity
{
    public Guid FactureGroupéeId { get; set; }
    public FactureGroupée FactureGroupée { get; set; } = null!;
    public Guid ORId { get; set; }
    public OrdreReparation OR { get; set; } = null!;
    public string Immatriculation { get; set; } = string.Empty;
    public string? NuméroFlotte { get; set; }
    public string TypeIntervention { get; set; } = string.Empty;
    public DateTime DateOR { get; set; }
    public decimal MontantHT { get; set; }
    public decimal TauxTVA { get; set; } = 19;
    public decimal TotalTTC { get; set; }
    public bool TarifAppliqué { get; set; }   // true si remise/forfait appliqué
}
