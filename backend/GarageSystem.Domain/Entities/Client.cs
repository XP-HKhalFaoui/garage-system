using GarageSystem.Domain.Common;
using GarageSystem.Domain.Enums;

namespace GarageSystem.Domain.Entities;

public class Client : SoftDeleteEntity
{
    public ClientType Type { get; set; }
    public string Nom { get; set; } = string.Empty;
    public string? Prénom { get; set; }
    public string? RaisonSociale { get; set; }
    public string Téléphone { get; set; } = string.Empty;
    public string? TéléphoneAlt { get; set; }
    public string? Email { get; set; }
    public string Adresse { get; set; } = string.Empty;
    public Wilaya Wilaya { get; set; }
    public DateTime? DateNaissance { get; set; }
    public string? NRC { get; set; }
    public string? NIF { get; set; }
    public bool IsActif { get; set; } = true;
    public Guid? PortailToken { get; set; }

    public string NomComplet => Type == ClientType.Particulier
        ? $"{Nom} {Prénom}".Trim()
        : RaisonSociale ?? Nom;

    public ICollection<Vehicule> Vehicules { get; set; } = new List<Vehicule>();
}
