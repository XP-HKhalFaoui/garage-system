using GarageSystem.Domain.Enums;

namespace GarageSystem.Api.DTOs.Fleet;

// ── Société ───────────────────────────────────────────────────────────────────

public record CreateSociétéDto(
    string RaisonSociale,
    string NRC,
    string NIF,
    string AdresseSiège,
    string TéléphoneRespAchats,
    string EmailFacturation
);

public record UpdateSociétéDto(
    string RaisonSociale,
    string NRC,
    string NIF,
    string AdresseSiège,
    string TéléphoneRespAchats,
    string EmailFacturation
);

public record SociétéSummaryDto(
    Guid Id,
    string RaisonSociale,
    string NRC,
    string NIF,
    string TéléphoneRespAchats,
    string EmailFacturation,
    bool IsActif,
    int NbVéhiculesActifs,
    TypeTarif? TarifActif
);

public record SociétéDetailDto(
    Guid Id,
    string RaisonSociale,
    string NRC,
    string NIF,
    string AdresseSiège,
    string TéléphoneRespAchats,
    string EmailFacturation,
    bool IsActif,
    ContratDto? ContratActif,
    int NbVéhiculesActifs
);

// ── Contrat ───────────────────────────────────────────────────────────────────

public record CreateContratDto(
    DateTime DateDébut,
    DateTime? DateFin,
    TypeTarif TypeTarif,
    decimal? PlafondMensuelDZD,
    decimal? RemisePourcentage,
    string? ConditionsParticulières
);

public record ContratDto(
    Guid Id,
    DateTime DateDébut,
    DateTime? DateFin,
    TypeTarif TypeTarif,
    decimal? PlafondMensuelDZD,
    decimal? RemisePourcentage,
    string? ConditionsParticulières,
    bool IsActif,
    DateTime DateCreation
);

// ── Flotte ────────────────────────────────────────────────────────────────────

public record AffecterVéhiculeDto(
    // Soit un véhicule existant
    Guid? VéhiculeId,
    // Soit un nouveau véhicule à créer
    string? Immatriculation,
    string? Marque,
    string? Modele,
    int? Année,
    // Infos d'affectation
    string? NuméroFlotte,
    string? ConducteurHabituel
);

public record VéhiculeSociétéDto(
    Guid Id,
    Guid VéhiculeId,
    string Immatriculation,
    string Marque,
    string Modele,
    int Année,
    string? NuméroFlotte,
    string? ConducteurHabituel,
    DateTime DateAffectation,
    // Stats mois courant
    int NbOR,
    decimal MontantMois
);

public record ORFlotteDto(
    Guid Id,
    string Numéro,
    string Immatriculation,
    string? NuméroFlotte,
    DateTime DateOuverture,
    string TypeIntervention,
    string Statut,
    decimal MontantHT,
    bool DéjàFacturé
);

// ── Facturation groupée ───────────────────────────────────────────────────────

public record CréerFactureGroupéeDto(
    int Mois,
    int Année,
    List<Guid>? OrIds   // null = tous les OR éligibles du mois
);

public record FactureGroupéeSummaryDto(
    Guid Id,
    string Numéro,
    int PériodeMois,
    int PériodeAnnée,
    decimal TotalTTC,
    bool DépassementPlafond,
    string Statut,
    DateTime DateFacture,
    int NbOR
);

public record FactureGroupéeDetailDto(
    Guid Id,
    string Numéro,
    string SociétéRaisonSociale,
    string SociétéNIF,
    string SociétéAdresse,
    int PériodeMois,
    int PériodeAnnée,
    decimal SousTotalHT,
    decimal MontantTVA,
    decimal TotalTTC,
    bool DépassementPlafond,
    string Statut,
    DateTime DateFacture,
    List<LigneFactureGroupéeDto> Lignes
);

public record LigneFactureGroupéeDto(
    Guid Id,
    Guid ORId,
    string Numéro,
    string Immatriculation,
    string? NuméroFlotte,
    string TypeIntervention,
    DateTime DateOR,
    decimal MontantHT,
    decimal TauxTVA,
    decimal TotalTTC,
    bool TarifAppliqué
);

public record PreviewFactureGroupéeDto(
    int NbOR,
    decimal SousTotalHT,
    decimal MontantTVA,
    decimal TotalTTC,
    bool DépassementPlafond,
    decimal? PlafondMensuel,
    List<ORFlotteDto> ORsÉligibles
);
