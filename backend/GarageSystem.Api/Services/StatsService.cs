using GarageSystem.Domain.Enums;
using GarageSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GarageSystem.Api.Services;

public record CaMensuelDto(string Mois, decimal CA, decimal Encaissé);
public record StatsTechnicienDto(string Nom, int NbOR, decimal TotalMO, decimal TauxOccupation);
public record StatsArticleDto(string Référence, string Désignation, int NbMouvements, decimal ValeurSortie);
public record DashboardStatsDto(
    decimal CaMoisCourant, decimal CaMoisPrécédent, decimal EvolutionCa,
    int NbOREnCours, int NbORTerminés, int NbClientsActifs,
    int NbArticlesSousMin, int NbFacturesEnRetard,
    int NbEmployésActifs, int NbPrésentsAujourdHui);

public class StatsService(ApplicationDbContext db)
{
    public async Task<DashboardStatsDto> GetDashboardAsync()
    {
        var now = DateTime.UtcNow;
        var debutMois = new DateTime(now.Year, now.Month, 1);
        var debutMoisPrec = debutMois.AddMonths(-1);

        var caMois = await db.Factures
            .Where(f => f.DateCreation >= debutMois && f.Statut != FactureStatut.Annulée)
            .SumAsync(f => (decimal?)f.TotalTTC) ?? 0;

        var caMoisPrec = await db.Factures
            .Where(f => f.DateCreation >= debutMoisPrec && f.DateCreation < debutMois && f.Statut != FactureStatut.Annulée)
            .SumAsync(f => (decimal?)f.TotalTTC) ?? 0;

        var evolution = caMoisPrec == 0 ? 0 : Math.Round((caMois - caMoisPrec) / caMoisPrec * 100, 1);

        var nbEnCours = await db.OrdresReparation
            .CountAsync(o => o.Statut != ORStatut.Livré && o.Statut != ORStatut.Annulé);

        var nbTerminésAujourdHui = await db.OrdresReparation
            .CountAsync(o => o.Statut == ORStatut.Livré
                          && o.DateFermeture != null
                          && o.DateFermeture >= DateTime.UtcNow.Date);

        var nbClients = await db.Clients.CountAsync(c => c.IsActif);
        var nbSousMin = await db.Articles.CountAsync(a => a.StockActuel <= a.StockMinimum);

        var nbEnRetard = await db.Factures
            .CountAsync(f => f.Statut != FactureStatut.Soldée && f.Statut != FactureStatut.Annulée
                          && f.DateEchéance < DateTime.UtcNow);

        var nbEmployés = await db.Employes.CountAsync(e => e.IsActif);
        var todayOnly = DateOnly.FromDateTime(DateTime.UtcNow);
        var nbPrésents = await db.Pointages
            .CountAsync(p => p.Date == todayOnly && p.HeureSortie == null);

        return new DashboardStatsDto(
            caMois, caMoisPrec, evolution,
            nbEnCours, nbTerminésAujourdHui, nbClients,
            nbSousMin, nbEnRetard,
            nbEmployés, nbPrésents);
    }

    public async Task<List<CaMensuelDto>> GetCaMensuelAsync(int nbMois = 12)
    {
        var début = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1).AddMonths(-(nbMois - 1));

        var raw = await db.Factures
            .Where(f => f.DateCreation >= début && f.Statut != FactureStatut.Annulée)
            .GroupBy(f => new { f.DateCreation.Year, f.DateCreation.Month })
            .Select(g => new {
                g.Key.Year, g.Key.Month,
                CA = g.Sum(f => f.TotalTTC),
                Encaissé = g.Sum(f => f.MontantDéjàPayé),
            })
            .ToListAsync();

        return raw
            .OrderBy(x => x.Year).ThenBy(x => x.Month)
            .Select(x => new CaMensuelDto($"{x.Year}-{x.Month:D2}", x.CA, x.Encaissé))
            .ToList();
    }

    public async Task<List<StatsTechnicienDto>> GetStatsTechniciensAsync(int? annee, int? mois)
    {
        var query = db.OrdresReparation.Where(o => o.Statut == ORStatut.Livré);

        if (annee.HasValue) query = query.Where(o => o.DateCreation.Year == annee.Value);
        if (mois.HasValue)  query = query.Where(o => o.DateCreation.Month == mois.Value);

        var raw = await query
            .Where(o => o.TechnicienId != null)
            .Include(o => o.Technicien)
            .Include(o => o.Lignes)
            .ToListAsync();

        return raw
            .GroupBy(o => new { o.TechnicienId, Nom = o.Technicien?.NomComplet ?? "Inconnu" })
            .Select(g => new StatsTechnicienDto(
                g.Key.Nom,
                g.Count(),
                g.SelectMany(o => o.Lignes).Where(l => l.Type == LigneORType.MO).Sum(l => l.PrixUnitaire * l.Quantité),
                Math.Round(g.Count() / Math.Max(1m, 20m) * 100, 1)
            ))
            .OrderByDescending(t => t.NbOR)
            .ToList();
    }

    public async Task<List<StatsArticleDto>> GetStatsStockAsync()
    {
        return await db.MouvementsStock
            .Include(m => m.Article)
            .Where(m => m.Type == MouvementStockType.SortieOR)
            .GroupBy(m => new { m.ArticleId, m.Article.Référence, m.Article.Désignation })
            .Select(g => new StatsArticleDto(
                g.Key.Référence,
                g.Key.Désignation,
                g.Count(),
                g.Sum(m => m.Quantité * m.Article.PrixVente)
            ))
            .OrderByDescending(a => a.NbMouvements)
            .Take(20)
            .ToListAsync();
    }
}
