using GarageSystem.Domain.Enums;

namespace GarageSystem.Api.DTOs.OR;

public record CreateORDto(
    Guid VehiculeId,
    Guid? TechnicienId,
    decimal KilométrageActuel,
    TypeIntervention TypeIntervention,
    ORPriorité Priorité,
    string? Diagnostic
);

public record AssignerTechnicienDto(Guid TechnicienId);

public record ChangerStatutDto(ORStatut NouveauStatut, string? Commentaire);

public record AddLigneORDto(
    LigneORType Type,
    Guid? ArticleId,
    string Description,
    decimal Quantité,
    decimal? PrixUnitaire
);

public record ORResponseDto(
    Guid Id,
    string Numéro,
    ORStatut Statut,
    ORPriorité Priorité,
    TypeIntervention TypeIntervention,
    DateTime DateOuverture,
    DateTime? HeureDebut,
    decimal MontantTotal,
    VehiculeInfoDto Vehicule,
    ClientInfoDto Client,
    TechnicienInfoDto? Technicien
);

public record ORSummaryDto(
    Guid Id,
    string Numéro,
    ORStatut Statut,
    ORPriorité Priorité,
    string HeureOuverture,
    VehiculeInfoDto Vehicule,
    ClientInfoDto Client,
    TechnicienInfoDto? Technicien,
    int NbLignes,
    decimal MontantEstimé
);

public record VehiculeInfoDto(Guid Id, string Immatriculation, string Marque, string Modele, decimal Km);
public record ClientInfoDto(Guid Id, string Nom, string Téléphone);
public record TechnicienInfoDto(Guid Id, string Nom, string Prénom);

public record StatsTodayDto(int Total, int EnAttente, int EnCours, int Terminés, decimal CaTotalHT);

public record LigneORResponseDto(
    Guid Id,
    LigneORType Type,
    Guid? ArticleId,
    string? ArticleRéférence,
    string Description,
    decimal Quantité,
    decimal PrixUnitaire,
    decimal TotalHT
);

public record HistoriqueStatutDto(
    Guid Id,
    ORStatut StatutAvant,
    ORStatut StatutAprès,
    string? Commentaire,
    DateTime Timestamp
);

public record ORDetailDto(
    Guid Id,
    string Numéro,
    ORStatut Statut,
    ORPriorité Priorité,
    TypeIntervention TypeIntervention,
    DateTime DateOuverture,
    DateTime? DateFermeture,
    DateTime? HeureDebut,
    string? Diagnostic,
    decimal MontantTotal,
    Guid? FactureId,
    VehiculeInfoDto Vehicule,
    ClientInfoDto Client,
    TechnicienInfoDto? Technicien,
    List<LigneORResponseDto> Lignes,
    List<HistoriqueStatutDto> Historique
);


public record PlanningORDto(
    Guid Id,
    string Numéro,
    ORStatut Statut,
    ORPriorité Priorité,
    TypeIntervention TypeIntervention,
    DateTime HeureDebut,
    DateTime? HeureFin,
    Guid? TechnicienId,
    string? TechnicienNom,
    string Immatriculation,
    string Marque,
    string Modele
);

public record ReplanifierORDto(
    DateTime HeureDebut,
    DateTime? HeureFin,
    Guid? TechnicienId
);
