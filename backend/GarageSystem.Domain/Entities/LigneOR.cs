using GarageSystem.Domain.Common;
using GarageSystem.Domain.Enums;

namespace GarageSystem.Domain.Entities;

public class LigneOR : BaseEntity
{
    public Guid ORId { get; set; }
    public OrdreReparation OR { get; set; } = null!;
    public LigneORType Type { get; set; }
    public Guid? ArticleId { get; set; }
    public Article? Article { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Quantité { get; set; }
    public decimal PrixUnitaire { get; set; }
    public decimal TotalHT => Quantité * PrixUnitaire;
}
