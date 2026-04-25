using GarageSystem.Domain.Common;
using GarageSystem.Domain.Enums;

namespace GarageSystem.Domain.Entities;

public class MouvementStock : BaseEntity
{
    public Guid ArticleId { get; set; }
    public Article Article { get; set; } = null!;
    public MouvementStockType Type { get; set; }
    public decimal Quantité { get; set; }
    public decimal StockAvant { get; set; }
    public decimal StockAprès { get; set; }
    public Guid? ORId { get; set; }
    public string? RéférenceDocument { get; set; }
    public string? Motif { get; set; }
    public string? UserId { get; set; }
}
