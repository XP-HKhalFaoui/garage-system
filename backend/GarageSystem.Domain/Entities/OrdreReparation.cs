using GarageSystem.Domain.Common;
using GarageSystem.Domain.Enums;

namespace GarageSystem.Domain.Entities;

public class OrdreReparation : BaseEntity
{
    public string Numéro { get; set; } = string.Empty;
    public Guid VehiculeId { get; set; }
    public Vehicule Vehicule { get; set; } = null!;
    public Guid? TechnicienId { get; set; }
    public Employe? Technicien { get; set; }
    public ORStatut Statut { get; set; } = ORStatut.EnAttente;
    public ORPriorité Priorité { get; set; } = ORPriorité.Normal;
    public TypeIntervention TypeIntervention { get; set; }
    public DateTime DateOuverture { get; set; } = DateTime.UtcNow;
    public DateTime? DateFermeture { get; set; }
    public DateTime? HeureDebut { get; set; }
    public string? Diagnostic { get; set; }
    public decimal MontantTotal { get; set; }
    public Guid? FactureId { get; set; }
    public Guid? FactureGroupéeId { get; set; }

    public ICollection<LigneOR> Lignes { get; set; } = new List<LigneOR>();
    public ICollection<HistoriqueStatutOR> HistoriqueStatuts { get; set; } = new List<HistoriqueStatutOR>();
}
