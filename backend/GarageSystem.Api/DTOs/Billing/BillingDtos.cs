using GarageSystem.Domain.Enums;

namespace GarageSystem.Api.DTOs.Billing;

// ── Devis ─────────────────────────────────────────────────────────────────────
public record DevisResponseDto(
    Guid Id,
    string Numéro,
    DevisStatut Statut,
    DateTime DateCreation,
    DateTime DateExpiration,
    DateTime? DateEnvoi,
    Guid ORId,
    Guid ClientId,
    string ClientNom,
    decimal SousTotalHT,
    decimal MontantTVA,
    decimal TotalTTC,
    List<LigneDevisDto> Lignes
);

public record LigneDevisDto(
    Guid Id,
    string Description,
    decimal Quantité,
    decimal PrixUnitaireHT,
    decimal TauxTVA,
    decimal TotalHT,
    decimal TotalTTC
);

// ── Facture ───────────────────────────────────────────────────────────────────
public record FactureResponseDto(
    Guid Id,
    string Numéro,
    FactureStatut Statut,
    DateTime DateFacture,
    DateTime DateEchéance,
    DateTime? DateSolde,
    string ClientNom,
    string ClientAdresse,
    string? ClientNIF,
    decimal SousTotalHT,
    decimal MontantTVA,
    decimal TotalTTC,
    decimal MontantDéjàPayé,
    decimal RestantDû,
    List<LigneFactureDto> Lignes,
    List<PaiementDto> Paiements
);

public record LigneFactureDto(
    Guid Id,
    string Description,
    decimal Quantité,
    decimal PrixUnitaireHT,
    decimal TauxTVA,
    decimal TotalHT,
    decimal TotalTTC
);

public record PaiementDto(
    Guid Id,
    decimal Montant,
    ModePaiement ModePaiement,
    string? Référence,
    DateTime DatePaiement
);

// ── Paiement ──────────────────────────────────────────────────────────────────
public record EnregistrerPaiementDto(
    decimal Montant,
    ModePaiement ModePaiement,
    string? Référence,
    DateTime DatePaiement
);

// ── Récap caisse ──────────────────────────────────────────────────────────────
public record RecapCaisseDto(
    decimal TotalEspèces,
    decimal TotalVirement,
    decimal TotalChèque,
    decimal TotalCB,
    decimal TotalGeneral,
    int NbFacturesSoldées
);

// ── Transitions devis ─────────────────────────────────────────────────────────
public record RefuserDevisDto(string Motif);
public record AnnulerFactureDto(string Motif);

// ── Liste factures ────────────────────────────────────────────────────────────
public record FactureSummaryDto(
    Guid Id,
    string Numéro,
    FactureStatut Statut,
    DateTime DateFacture,
    DateTime DateEchéance,
    string ClientNom,
    string? ImmatriculationVehicule,
    decimal TotalTTC,
    decimal MontantDéjàPayé,
    decimal RestantDû,
    bool EnRetard
);

public record StatsBillingDto(
    decimal CaMoisTTC,
    decimal Encaissé,
    decimal ResteAEncaisser,
    int NbEnRetard
);
