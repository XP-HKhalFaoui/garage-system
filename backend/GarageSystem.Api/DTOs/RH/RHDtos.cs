using GarageSystem.Domain.Enums;

namespace GarageSystem.Api.DTOs.RH;

// ── Employés ──────────────────────────────────────────────────────────────────
public record CreateEmployeDto(
    string Nom, string Prénom, DateTime DateNaissance,
    string Téléphone, string Email, string Adresse,
    TypePoste Poste, string? Département,
    decimal SalaireBase, TypeContrat TypeContrat,
    DateTime DateEmbauche, DateTime? DateFinContrat);

public record UpdateEmployeDto(
    string Nom, string Prénom,
    string Téléphone, string Email, string Adresse,
    TypePoste Poste, string? Département,
    decimal SalaireBase, TypeContrat TypeContrat,
    DateTime? DateFinContrat);

public record EmployeResponseDto(
    Guid Id, string Nom, string Prénom, string NomComplet,
    string Téléphone, string Email, string Adresse,
    TypePoste Poste, string? Département,
    decimal? SalaireBase,  // null si non RH/Admin
    TypeContrat TypeContrat,
    DateTime DateEmbauche, DateTime? DateFinContrat,
    bool IsActif, int NbOREffectués);

public record EmployeSummaryDto(
    Guid Id, string NomComplet, TypePoste Poste, bool IsActif);

// ── Pointage ──────────────────────────────────────────────────────────────────
public record PointageEntréeDto(Guid? EmployeId);
public record PointageSortieDto(Guid? EmployeId);

public record PointageResponseDto(
    Guid Id, Guid EmployeId, string EmployeNom,
    DateOnly Date, TimeOnly HeureEntrée, TimeOnly? HeureSortie,
    TypeJour TypeJour, decimal NbHeuresTravaillées,
    decimal NbHeuresSup, string? Notes);

public record PointageMensuelDto(
    Guid EmployeId, string EmployeNom, string Mois,
    List<PointageResponseDto> Jours,
    decimal TotalHeures, decimal HeuresSup,
    int JoursAbsents, int Conges);

public record PrésentAujourdHuiDto(
    List<EmployéPrésentDto> Présents,
    List<EmployeSummaryDto> Absents);

public record EmployéPrésentDto(Guid Id, string NomComplet, TimeOnly HeureEntrée);

// ── Paie ──────────────────────────────────────────────────────────────────────
public record CalculerPaieDto(Guid EmployeId, string Mois);

public record BulletinPaieDto(
    Guid Id, Guid EmployeId, string EmployeNom, string Mois,
    int JoursTravaillés, int JoursOuvrablesMois,
    decimal SalaireBase, decimal SalaireBasePropratisé,
    decimal MajHeuresSup, decimal TotalPrimes,
    decimal SalaireBrut,
    decimal CotisationCNAS, decimal CotisationRetraite, decimal IRG,
    decimal TotalCotisations, decimal SalaireNet,
    string Statut, DateTime? DatePaiement, string? ModePaiement);

public record MarquerPayéDto(DateTime DatePaiement, string ModePaiement);

public record CreatePrimeDto(Guid EmployeId, string Mois, string Type, decimal Montant, string? Description);

// ── Congés ────────────────────────────────────────────────────────────────────
public record DemandeCongeDto(
    TypeConge Type, DateOnly DateDébut, DateOnly DateFin, string Motif);

public record CongeResponseDto(
    Guid Id, Guid EmployeId, string EmployeNom,
    TypeConge Type, DateOnly DateDébut, DateOnly DateFin,
    int NbJours, string Motif, CongeStatut Statut,
    DateTime? DateDecision, string? CommentaireDecision);

public record DecisionCongeDto(string? Commentaire);

public record SoldeCongeDto(
    Guid EmployeId, int Année, int AnnuelTotal, int AnnuelPris, int AnnuelRestant);
