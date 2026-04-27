using GarageSystem.Domain.Common;
using GarageSystem.Domain.Enums;

namespace GarageSystem.Domain.Entities;

public class Pointage : BaseEntity
{
    public Guid EmployeId { get; set; }
    public Employe Employe { get; set; } = null!;
    public DateOnly Date { get; set; }
    public TimeOnly HeureEntrée { get; set; }
    public TimeOnly? HeureSortie { get; set; }
    public TypeJour TypeJour { get; set; } = TypeJour.Travaillé;
    public decimal NbHeuresTravaillées { get; set; }
    public decimal NbHeuresSup { get; set; }
    public string? Notes { get; set; }
}

public class DemandeConge : BaseEntity
{
    public Guid EmployeId { get; set; }
    public Employe Employe { get; set; } = null!;
    public TypeConge Type { get; set; }
    public DateOnly DateDébut { get; set; }
    public DateOnly DateFin { get; set; }
    public int NbJours { get; set; }
    public string Motif { get; set; } = string.Empty;
    public CongeStatut Statut { get; set; } = CongeStatut.EnAttente;
    public Guid? ApprobateurId { get; set; }
    public DateTime? DateDecision { get; set; }
    public string? CommentaireDecision { get; set; }
}

public class SoldeConge : BaseEntity
{
    public Guid EmployeId { get; set; }
    public Employe Employe { get; set; } = null!;
    public int Année { get; set; }
    public int AnnuelTotal { get; set; } = 30;
    public int AnnuelPris { get; set; }
    public int AnnuelRestant => AnnuelTotal - AnnuelPris;
}

public class Prime : BaseEntity
{
    public Guid EmployeId { get; set; }
    public Employe Employe { get; set; } = null!;
    public string Mois { get; set; } = string.Empty;  // "2024-11"
    public string Type { get; set; } = string.Empty;  // Rendement | Ancienneté | Exceptionnelle
    public decimal Montant { get; set; }
    public string? Description { get; set; }
}

public class BulletinPaie : BaseEntity
{
    public Guid EmployeId { get; set; }
    public Employe Employe { get; set; } = null!;
    public string Mois { get; set; } = string.Empty;  // "2024-11"
    public int JoursTravaillés { get; set; }
    public int JoursOuvrablesMois { get; set; }
    public decimal SalaireBase { get; set; }
    public decimal SalaireBasePropratisé { get; set; }
    public decimal MajHeuresSup { get; set; }
    public decimal TotalPrimes { get; set; }
    public decimal SalaireBrut { get; set; }
    public decimal CotisationCNAS { get; set; }
    public decimal CotisationRetraite { get; set; }
    public decimal IRG { get; set; }
    public decimal TotalCotisations { get; set; }
    public decimal SalaireNet { get; set; }
    public string Statut { get; set; } = "EnAttente";  // EnAttente | Payé
    public DateTime? DatePaiement { get; set; }
    public string? ModePaiement { get; set; }
}
