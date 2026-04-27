using GarageSystem.Domain.Common;
using GarageSystem.Domain.Enums;

namespace GarageSystem.Domain.Entities;

public class Employe : SoftDeleteEntity
{
    public string Nom { get; set; } = string.Empty;
    public string Prénom { get; set; } = string.Empty;
    public DateTime DateNaissance { get; set; }
    public string Téléphone { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string Adresse { get; set; } = string.Empty;
    public TypePoste Poste { get; set; }
    public string? Département { get; set; }
    public decimal SalaireBase { get; set; }
    public TypeContrat TypeContrat { get; set; }
    public DateTime DateEmbauche { get; set; }
    public DateTime? DateFinContrat { get; set; }
    public string? NuméroSécuritéSociale { get; set; } // chiffré en DB
    public string? UserId { get; set; }
    public bool IsActif { get; set; } = true;
    public string NomComplet => $"{Prénom} {Nom}".Trim();

    public ICollection<OrdreReparation> OrdresAssignés { get; set; } = new List<OrdreReparation>();
}
