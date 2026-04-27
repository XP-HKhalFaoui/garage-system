using GarageSystem.Domain.Services.Maintenance;

namespace GarageSystem.Api.DTOs.CRM;

// ── Historique véhicule ───────────────────────────────────────────────────────
public record VehiculeHistoriqueDto(
    VehiculeDetailDto Vehicule,
    ClientDetailDto Client,
    VehiculeStatistiquesDto Statistiques,
    List<InterventionHistoriqueDto> Interventions,
    List<OffreEnvoyeeHistDto> OffresEnvoyees);

public record VehiculeDetailDto(
    Guid Id,
    string Immatriculation,
    string? Vin,
    string Marque,
    string Modele,
    string? Version,
    int Annee,
    string Carburant,
    string Transmission,
    decimal KilométrageActuel,
    bool IsActif);

public record ClientDetailDto(
    Guid Id,
    string Nom,
    string? Prénom,
    string? RaisonSociale,
    string Téléphone,
    string? Email,
    string Wilaya);

public record VehiculeStatistiquesDto(
    int NbInterventions,
    decimal MontantTotalHT,
    DateTime? PremièreVisite,
    DateTime? DernièreVisite,
    decimal KmParcourus);

public record InterventionHistoriqueDto(
    Guid OrId,
    string Numéro,
    DateTime Date,
    decimal? KmAuMoment,
    string TypeIntervention,
    string? TechnicienNom,
    string Statut,
    decimal MontantHT,
    List<PièceHistoriqueDto> Pièces,
    List<MOHistoriqueDto> MainOeuvre);

public record PièceHistoriqueDto(
    string? Référence,
    string Description,
    decimal Quantité,
    decimal PuHT,
    decimal TotalHT);

public record MOHistoriqueDto(
    string Description,
    decimal Quantité,
    decimal PuHT,
    decimal TotalHT);

public record OffreEnvoyeeHistDto(
    Guid Id,
    List<string> Types,
    string Canal,
    DateTime DateEnvoi,
    string Statut);

// ── Véhicule CRUD ─────────────────────────────────────────────────────────────
public record CreateVehiculeDto(
    Guid ClientId,
    string Immatriculation,
    string? Vin,
    string Marque,
    string Modele,
    string? Version,
    int Annee,
    string Carburant,
    string Transmission,
    int? Cylindrée,
    string? Couleur,
    decimal KilométrageActuel);

public record UpdateVehiculeDto(
    string? Vin,
    string Marque,
    string Modele,
    string? Version,
    int Annee,
    string Carburant,
    string Transmission,
    int? Cylindrée,
    string? Couleur);

public record MajKilométrageDto(decimal Km);

public record VehiculeResponseDto(
    Guid Id,
    Guid ClientId,
    string ClientNom,
    string Immatriculation,
    string? Vin,
    string Marque,
    string Modele,
    string? Version,
    int Annee,
    string Carburant,
    string Transmission,
    decimal KilométrageActuel,
    DateTime? DateDernièreVisite,
    bool IsActif,
    int NbOR,
    List<OffreEntretienDto>? OffresDues);

public record VehiculeSearchResultDto(
    Guid Id,
    string Immatriculation,
    string Marque,
    string Modele,
    int Annee,
    string ClientNom,
    string ClientTéléphone);

// ── Offres entretien ──────────────────────────────────────────────────────────
public record OffreEntretienDto(
    string Type,
    string Urgence,
    int? KmRestants,
    int? JoursRestants,
    string MessageSuggéré);

public record VehiculeAvecOffresDto(
    Guid VehiculeId,
    string Immatriculation,
    string Marque,
    string Modele,
    ClientOffreDto Client,
    List<OffreEntretienDto> Offres,
    DateTime? DernierEnvoi);

public record ClientOffreDto(
    Guid Id,
    string Nom,
    string Téléphone,
    string? Email);

public record EnvoyerOffresDto(
    List<Guid> VehiculeIds,
    string Canal);

public record EnvoyerOffresResultDto(
    int VehiculesTraités,
    int Envoyées,
    List<EchecEnvoiDto> Echecs);

public record EchecEnvoiDto(Guid VehiculeId, string Raison);

public record ChangerStatutOffreDto(string Statut);

// ── Client CRUD ───────────────────────────────────────────────────────────────
public record CreateClientDto(
    string Type,
    string Nom,
    string? Prénom,
    string? RaisonSociale,
    string Téléphone,
    string? TéléphoneAlt,
    string? Email,
    string Adresse,
    string Wilaya,
    DateTime? DateNaissance,
    string? Nrc,
    string? Nif);

public record UpdateClientDto(
    string Nom,
    string? Prénom,
    string? RaisonSociale,
    string? TéléphoneAlt,
    string? Email,
    string Adresse,
    string Wilaya,
    DateTime? DateNaissance,
    string? Nrc,
    string? Nif);

public record ClientResponseDto(
    Guid Id,
    string Type,
    string Nom,
    string? Prénom,
    string? RaisonSociale,
    string Téléphone,
    string? TéléphoneAlt,
    string? Email,
    string Adresse,
    string Wilaya,
    bool IsActif,
    DateTime DateCreation,
    int NbVéhicules,
    int NbOR,
    decimal CaTotalHT,
    DateTime? DernièreVisite);

public record ClientSearchResultDto(
    Guid Id,
    string DisplayName,
    string Téléphone,
    int NbVéhicules);
