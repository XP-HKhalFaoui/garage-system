using GarageSystem.Domain.Common;
using GarageSystem.Domain.Enums;

namespace GarageSystem.Domain.Entities;

public class Article : SoftDeleteEntity
{
    public string Référence { get; set; } = string.Empty;
    public string? RéférenceOEM { get; set; }
    public string Désignation { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ArticleCategorie Catégorie { get; set; }
    public string? MarquesCompatibles { get; set; }
    public ArticleUnité Unité { get; set; } = ArticleUnité.Pièce;
    public decimal StockActuel { get; set; }
    public decimal StockMinimum { get; set; }
    public decimal? StockMaximum { get; set; }
    public decimal PrixAchat { get; set; }
    public decimal PrixVente { get; set; }
    public decimal MargeHT => PrixAchat > 0 ? (PrixVente - PrixAchat) / PrixAchat * 100 : 0;
    public string? EmplacementRayonnage { get; set; }
    public string? CodeBarre { get; set; }
    public bool IsActif { get; set; } = true;
    public DateTime? DateDernierMouvement { get; set; }
    public DateTime? DateDernièreCommande { get; set; }

    public ICollection<MouvementStock> Mouvements { get; set; } = new List<MouvementStock>();
}
