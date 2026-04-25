using GarageSystem.Domain.Common;
using GarageSystem.Domain.Enums;

namespace GarageSystem.Domain.Entities;

public class HistoriqueStatutOR : BaseEntity
{
    public Guid ORId { get; set; }
    public OrdreReparation OR { get; set; } = null!;
    public ORStatut StatutAvant { get; set; }
    public ORStatut StatutAprès { get; set; }
    public string? Commentaire { get; set; }
    public string? UserId { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
