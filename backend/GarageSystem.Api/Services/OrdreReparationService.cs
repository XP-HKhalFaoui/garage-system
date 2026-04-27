using GarageSystem.Api.DTOs.OR;
using GarageSystem.Api.Hubs;
using GarageSystem.Domain.Entities;
using GarageSystem.Domain.Enums;
using GarageSystem.Domain.Exceptions;
using GarageSystem.Domain.Services;
using GarageSystem.Infrastructure.Persistence;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace GarageSystem.Api.Services;

public class OrdreReparationService
{
    private readonly ApplicationDbContext _db;
    private readonly IHubContext<OrdresHub> _hub;
    private readonly IMemoryCache _cache;

    public OrdreReparationService(
        ApplicationDbContext db,
        IHubContext<OrdresHub> hub,
        IMemoryCache cache)
    {
        _db = db;
        _hub = hub;
        _cache = cache;
    }

    // ── Création ─────────────────────────────────────────────────────────────
    public async Task<ORResponseDto> CreateAsync(CreateORDto dto, string userId)
    {
        var vehicule = await _db.Vehicules
            .Include(v => v.Client)
            .FirstOrDefaultAsync(v => v.Id == dto.VehiculeId && v.IsActif)
            ?? throw new NotFoundException("Véhicule", dto.VehiculeId);

        var orActif = await _db.OrdresReparation.AnyAsync(o =>
            o.VehiculeId == dto.VehiculeId &&
            o.Statut != ORStatut.Livré &&
            o.Statut != ORStatut.Annulé);

        if (orActif)
            throw new BusinessRuleException("Ce véhicule a déjà un OR actif en cours.");

        if (dto.KilométrageActuel < vehicule.KilométrageActuel)
            throw new BusinessRuleException(
                $"Le kilométrage saisi ({dto.KilométrageActuel}) est inférieur au kilométrage actuel ({vehicule.KilométrageActuel}).");

        if (dto.TechnicienId.HasValue)
        {
            var techExiste = await _db.Employes.AnyAsync(e => e.Id == dto.TechnicienId && e.IsActif);
            if (!techExiste) throw new NotFoundException("Technicien", dto.TechnicienId);
        }

        var numéro = await GenerateNuméroAsync();

        var or = new OrdreReparation
        {
            Numéro          = numéro,
            VehiculeId      = dto.VehiculeId,
            TechnicienId    = dto.TechnicienId,
            TypeIntervention = dto.TypeIntervention,
            Priorité        = dto.Priorité,
            Diagnostic      = dto.Diagnostic,
            Statut          = ORStatut.EnAttente,
            DateOuverture   = DateTime.UtcNow,
        };

        if (dto.TechnicienId.HasValue)
        {
            or.Statut    = ORStatut.EnCours;
            or.HeureDebut = DateTime.UtcNow;
        }

        if (dto.KilométrageActuel > vehicule.KilométrageActuel)
            vehicule.KilométrageActuel = dto.KilométrageActuel;

        _db.OrdresReparation.Add(or);
        await _db.SaveChangesAsync();
        InvalidateCache();

        await _hub.Clients.All.SendAsync("NotifyORCreated",
            new { or.Id, or.Numéro, statut = or.Statut.ToString(), timestamp = DateTime.UtcNow });

        return await BuildResponseAsync(or.Id);
    }

    // ── Listing du jour ───────────────────────────────────────────────────────
    public async Task<List<ORSummaryDto>> GetTodayAsync(ORStatut? statut, Guid? technicienId)
    {
        var cacheKey = $"or-today-{DateTime.UtcNow:yyyy-MM-dd}";

        if (!_cache.TryGetValue(cacheKey, out List<ORSummaryDto>? cached))
        {
            var today = DateTime.UtcNow.Date;

            cached = await _db.OrdresReparation
                .Where(o => o.DateOuverture.Date == today)
                .Include(o => o.Vehicule).ThenInclude(v => v.Client)
                .Include(o => o.Technicien)
                .Include(o => o.Lignes)
                .AsNoTracking()
                .OrderBy(o =>
                    o.Statut == ORStatut.EnCours   ? 0 :
                    o.Statut == ORStatut.EnAttente  ? 1 : 2)
                .ThenByDescending(o => o.Priorité == ORPriorité.Urgent)
                .Select(o => new ORSummaryDto(
                    o.Id,
                    o.Numéro,
                    o.Statut,
                    o.Priorité,
                    o.DateOuverture.ToString("HH:mm"),
                    new VehiculeInfoDto(o.Vehicule.Id, o.Vehicule.Immatriculation,
                        o.Vehicule.Marque, o.Vehicule.Modele, o.Vehicule.KilométrageActuel),
                    new ClientInfoDto(o.Vehicule.Client.Id, o.Vehicule.Client.Nom,
                        o.Vehicule.Client.Téléphone),
                    o.Technicien == null ? null :
                        new TechnicienInfoDto(o.Technicien.Id, o.Technicien.Nom, o.Technicien.Prénom),
                    o.Lignes.Count,
                    o.MontantTotal
                ))
                .ToListAsync();

            _cache.Set(cacheKey, cached, TimeSpan.FromSeconds(30));
        }

        var result = cached!;
        if (statut.HasValue)      result = result.Where(o => o.Statut      == statut).ToList();
        if (technicienId.HasValue) result = result.Where(o => o.Technicien?.Id == technicienId).ToList();
        return result;
    }

    // ── Statistiques du jour ──────────────────────────────────────────────────
    public async Task<StatsTodayDto> GetStatsTodayAsync()
    {
        var today = DateTime.UtcNow.Date;
        var ors   = await _db.OrdresReparation
            .Where(o => o.DateOuverture.Date == today)
            .AsNoTracking()
            .ToListAsync();

        return new StatsTodayDto(
            Total     : ors.Count,
            EnAttente : ors.Count(o => o.Statut == ORStatut.EnAttente),
            EnCours   : ors.Count(o => o.Statut == ORStatut.EnCours),
            Terminés  : ors.Count(o => o.Statut is ORStatut.TerminéTechnicien or ORStatut.Livré),
            CaTotalHT : ors.Sum(o => o.MontantTotal)
        );
    }

    // ── Assignation technicien ────────────────────────────────────────────────
    public async Task AssignerTechnicienAsync(Guid orId, Guid technicienId, string userId)
    {
        var or = await _db.OrdresReparation.FindAsync(orId)
            ?? throw new NotFoundException("OR", orId);

        if (or.Statut != ORStatut.EnAttente && or.Statut != ORStatut.EnCours)
            throw new ConflictException("L'OR doit être En attente ou En cours pour assigner un technicien.");

        var tech = await _db.Employes.FindAsync(technicienId)
            ?? throw new NotFoundException("Technicien", technicienId);

        if (!tech.IsActif)
            throw new BusinessRuleException("Ce technicien n'est pas actif.");

        or.TechnicienId = technicienId;
        if (or.Statut == ORStatut.EnAttente)
        {
            or.Statut    = ORStatut.EnCours;
            or.HeureDebut = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        InvalidateCache();

        await _hub.Clients.All.SendAsync("NotifyORAssigned", new
        {
            orId,
            or.Numéro,
            technicien = $"{tech.Prénom} {tech.Nom}",
            timestamp  = DateTime.UtcNow
        });
    }

    // ── Transition de statut ──────────────────────────────────────────────────
    public async Task ChangerStatutAsync(Guid orId, ChangerStatutDto dto, string userId)
    {
        var or = await _db.OrdresReparation.FindAsync(orId)
            ?? throw new NotFoundException("OR", orId);

        ORStatutMachine.ValidateTransition(or.Statut, dto.NouveauStatut);

        if (dto.NouveauStatut == ORStatut.EnCours && or.TechnicienId is null)
            throw new BusinessRuleException("Un technicien doit être assigné avant de passer En cours.");

        if (dto.NouveauStatut == ORStatut.Suspendu && string.IsNullOrWhiteSpace(dto.Commentaire))
            throw new BusinessRuleException("Un commentaire est obligatoire pour suspendre un OR.");

        _db.HistoriqueStatutsOR.Add(new HistoriqueStatutOR
        {
            ORId        = orId,
            StatutAvant = or.Statut,
            StatutAprès = dto.NouveauStatut,
            Commentaire = dto.Commentaire,
            UserId      = userId,
        });

        or.Statut = dto.NouveauStatut;

        if (dto.NouveauStatut == ORStatut.TerminéTechnicien)
        {
            or.MontantTotal = await _db.LignesOR
                .Where(l => l.ORId == orId)
                .SumAsync(l => l.Quantité * l.PrixUnitaire);
        }

        if (dto.NouveauStatut == ORStatut.Livré)
        {
            or.DateFermeture = DateTime.UtcNow;
            var v = await _db.Vehicules.FindAsync(or.VehiculeId);
            if (v is not null) v.DateDernièreVisite = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        InvalidateCache();

        await _hub.Clients.All.SendAsync("NotifyORStatusChanged", new
        {
            orId, or.Numéro,
            statut    = dto.NouveauStatut.ToString(),
            timestamp = DateTime.UtcNow
        });
    }

    // ── Lignes OR ─────────────────────────────────────────────────────────────
    public async Task<LigneORResponseDto> AddLigneAsync(Guid orId, AddLigneORDto dto, string userId)
    {
        var or = await _db.OrdresReparation.FindAsync(orId)
            ?? throw new NotFoundException("OR", orId);

        if (or.Statut != ORStatut.EnCours)
            throw new ConflictException("Les lignes ne peuvent être ajoutées que sur un OR En cours.");

        decimal prixUnitaire = dto.PrixUnitaire ?? 0;
        string? articleRéf   = null;

        if (dto.Type == LigneORType.Pièce)
        {
            if (!dto.ArticleId.HasValue)
                throw new BusinessRuleException("Un article est obligatoire pour une ligne de type Pièce.");

            var article = await _db.Articles.FindAsync(dto.ArticleId.Value)
                ?? throw new NotFoundException("Article", dto.ArticleId.Value);

            if (article.StockActuel < dto.Quantité)
                throw new BusinessRuleException(
                    $"Stock insuffisant pour '{article.Désignation}' (disponible : {article.StockActuel}).");

            prixUnitaire = dto.PrixUnitaire ?? article.PrixVente;
            articleRéf   = article.Référence;

            var avant = article.StockActuel;
            article.StockActuel     -= dto.Quantité;
            article.DateDernierMouvement = DateTime.UtcNow;

            _db.MouvementsStock.Add(new MouvementStock
            {
                ArticleId          = article.Id,
                Type               = MouvementStockType.SortieOR,
                Quantité           = -dto.Quantité,
                StockAvant         = avant,
                StockAprès         = article.StockActuel,
                ORId               = orId,
                RéférenceDocument  = or.Numéro,
                UserId             = userId,
            });
        }
        else
        {
            if (string.IsNullOrWhiteSpace(dto.Description))
                throw new BusinessRuleException("La description est obligatoire pour une ligne Main d'œuvre.");
        }

        var ligne = new LigneOR
        {
            ORId        = orId,
            Type        = dto.Type,
            ArticleId   = dto.ArticleId,
            Description = dto.Description,
            Quantité    = dto.Quantité,
            PrixUnitaire = prixUnitaire,
        };

        _db.LignesOR.Add(ligne);

        // Recalcul montant OR
        or.MontantTotal = await _db.LignesOR
            .Where(l => l.ORId == orId)
            .SumAsync(l => l.Quantité * l.PrixUnitaire) + ligne.Quantité * prixUnitaire;

        await _db.SaveChangesAsync();

        return new LigneORResponseDto(
            ligne.Id, ligne.Type, ligne.ArticleId, articleRéf,
            ligne.Description, ligne.Quantité, ligne.PrixUnitaire, ligne.Quantité * ligne.PrixUnitaire);
    }

    public async Task RemoveLigneAsync(Guid orId, Guid ligneId, string userId)
    {
        var or = await _db.OrdresReparation.FindAsync(orId)
            ?? throw new NotFoundException("OR", orId);

        if (or.Statut != ORStatut.EnCours)
            throw new ConflictException("Impossible de supprimer une ligne sur un OR qui n'est pas En cours.");

        var ligne = await _db.LignesOR.FindAsync(ligneId)
            ?? throw new NotFoundException("Ligne OR", ligneId);

        if (ligne.Type == LigneORType.Pièce && ligne.ArticleId.HasValue)
        {
            var article = await _db.Articles.FindAsync(ligne.ArticleId.Value);
            if (article is not null)
            {
                var avant = article.StockActuel;
                article.StockActuel        += ligne.Quantité;
                article.DateDernierMouvement = DateTime.UtcNow;

                _db.MouvementsStock.Add(new MouvementStock
                {
                    ArticleId         = article.Id,
                    Type              = MouvementStockType.AnnulationOR,
                    Quantité          = ligne.Quantité,
                    StockAvant        = avant,
                    StockAprès        = article.StockActuel,
                    ORId              = orId,
                    RéférenceDocument = or.Numéro,
                    UserId            = userId,
                });
            }
        }

        _db.LignesOR.Remove(ligne);

        or.MontantTotal = await _db.LignesOR
            .Where(l => l.ORId == orId && l.Id != ligneId)
            .SumAsync(l => l.Quantité * l.PrixUnitaire);

        await _db.SaveChangesAsync();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private async Task<string> GenerateNuméroAsync()
    {
        var année  = DateTime.UtcNow.Year;
        var count  = await _db.OrdresReparation.CountAsync(o => o.DateOuverture.Year == année);
        return $"OR-{année}-{(count + 1):D4}";
    }

    private void InvalidateCache()
        => _cache.Remove($"or-today-{DateTime.UtcNow:yyyy-MM-dd}");

    private async Task<ORResponseDto> BuildResponseAsync(Guid id)
    {
        var o = await _db.OrdresReparation
            .Include(o => o.Vehicule).ThenInclude(v => v.Client)
            .Include(o => o.Technicien)
            .FirstAsync(o => o.Id == id);

        return new ORResponseDto(
            o.Id, o.Numéro, o.Statut, o.Priorité, o.TypeIntervention,
            o.DateOuverture, o.HeureDebut, o.MontantTotal,
            new VehiculeInfoDto(o.Vehicule.Id, o.Vehicule.Immatriculation,
                o.Vehicule.Marque, o.Vehicule.Modele, o.Vehicule.KilométrageActuel),
            new ClientInfoDto(o.Vehicule.Client.Id, o.Vehicule.Client.Nom,
                o.Vehicule.Client.Téléphone),
            o.Technicien is null ? null :
                new TechnicienInfoDto(o.Technicien.Id, o.Technicien.Nom, o.Technicien.Prénom)
        );
    }
}
