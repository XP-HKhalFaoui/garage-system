using GarageSystem.Domain.Common;
using GarageSystem.Domain.Enums;

namespace GarageSystem.Domain.Entities;

public class Vehicule : SoftDeleteEntity
{
    public Guid ClientId { get; set; }
    public Client Client { get; set; } = null!;
    public string Immatriculation { get; set; } = string.Empty;
    public string? VIN { get; set; }
    public string Marque { get; set; } = string.Empty;
    public string Modele { get; set; } = string.Empty;
    public string? Version { get; set; }
    public int Année { get; set; }
    public Carburant Carburant { get; set; }
    public int? Cylindrée { get; set; }
    public Transmission Transmission { get; set; }
    public string? Couleur { get; set; }
    public decimal KilométrageActuel { get; set; }
    public decimal KilométrageDernièreVisite { get; set; }
    public DateTime? DateDernièreVisite { get; set; }
    public bool IsActif { get; set; } = true;

    public ICollection<OrdreReparation> OrdresReparation { get; set; } = new List<OrdreReparation>();
}
