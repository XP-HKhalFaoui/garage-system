using GarageSystem.Api.DTOs.Fleet;
using GarageSystem.Domain.Entities;
using GarageSystem.Domain.Enums;
using GarageSystem.Domain.Exceptions;
using GarageSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GarageSystem.Api.Services;

// ── Tarification ───────────────────────────────────────────────────────────────

public static class TarifContratService
{
    private const decimal TVA = 19m;

    /// <summary>Applique le tarif du contrat sur un montant HT et retourne (montantHT, totalTTC, tarifAppliqué).</summary>
    public static (decimal MontantHT, decimal TotalTTC, bool TarifAppliqué) AppliquerTarif(
        Contrat contrat, decimal montantNormal)
    {
        decimal ht = contrat.TypeTarif switch
        {
            TypeTarif.PrixRéduit when contrat.RemisePourcentage.HasValue
                => montantNormal * (1 - contrat.RemisePourcentage.Value / 100m),
            TypeTarif.Forfait
                => montantNormal,   // Forfait : on garde le montant OR tel quel (forfait géré au contrat)
            _ => montantNormal,     // TarifNormal
        };

        bool tarifAppliqué = contrat.TypeTarif != TypeTarif.TarifNormal;
        decimal ttc = ht * (1 + TVA / 100m);
        return (Math.Round(ht, 2), Math.Round(ttc, 2), tarifAppliqué);
    }
}

// ── Service Fleet ──────────────────────────────────────────────────────────────

public class FleetService(ApplicationDbContext db)
{
    private const decimal TVA = 19m;

    // ── Sociétés ──────────────────────────────────────────────────────────────

    public async Task<List<SociétéSummaryDto>> GetSociétésAsync(bool? actif = null)
    {
        var q = db.Sociétés
            .Include(s => s.Contrats)
            .Include(s => s.VéhiculesSociété)
            .AsNoTracking()
            .AsQueryable();

        if (actif.HasValue) q = q.Where(s => s.IsActif == actif.Value);

        var list = await q.OrderBy(s => s.RaisonSociale).ToListAsync();

        return list.Select(s =>
        {
            var contratActif = ContratActifAujourdhui(s.Contrats);
            return new SociétéSummaryDto(
                s.Id, s.RaisonSociale, s.NRC, s.NIF,
                s.TéléphoneRespAchats, s.EmailFacturation, s.IsActif,
                s.VéhiculesSociété.Count(v => v.IsActif),
                contratActif?.TypeTarif
            );
        }).ToList();
    }

    public async Task<SociétéDetailDto> GetSociétéAsync(Guid id)
    {
        var s = await db.Sociétés
            .Include(s => s.Contrats)
            .Include(s => s.VéhiculesSociété)
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == id)
            ?? throw new NotFoundException("Société", id);

        var contrat = ContratActifAujourdhui(s.Contrats);
        return new SociétéDetailDto(
            s.Id, s.RaisonSociale, s.NRC, s.NIF, s.AdresseSiège,
            s.TéléphoneRespAchats, s.EmailFacturation, s.IsActif,
            contrat is null ? null : MapContrat(contrat),
            s.VéhiculesSociété.Count(v => v.IsActif)
        );
    }

    public async Task<SociétéDetailDto> CreateSociétéAsync(CreateSociétéDto dto)
    {
        if (await db.Sociétés.AnyAsync(s => s.NRC == dto.NRC))
            throw new ConflictException($"Une société avec le NRC '{dto.NRC}' existe déjà.");

        var s = new Société
        {
            RaisonSociale        = dto.RaisonSociale,
            NRC                  = dto.NRC,
            NIF                  = dto.NIF,
            AdresseSiège         = dto.AdresseSiège,
            TéléphoneRespAchats  = dto.TéléphoneRespAchats,
            EmailFacturation     = dto.EmailFacturation,
        };
        db.Sociétés.Add(s);
        await db.SaveChangesAsync();
        return await GetSociétéAsync(s.Id);
    }

    public async Task<SociétéDetailDto> UpdateSociétéAsync(Guid id, UpdateSociétéDto dto)
    {
        var s = await db.Sociétés.FindAsync(id)
            ?? throw new NotFoundException("Société", id);

        if (await db.Sociétés.AnyAsync(x => x.NRC == dto.NRC && x.Id != id))
            throw new ConflictException($"NRC '{dto.NRC}' déjà utilisé.");

        s.RaisonSociale       = dto.RaisonSociale;
        s.NRC                 = dto.NRC;
        s.NIF                 = dto.NIF;
        s.AdresseSiège        = dto.AdresseSiège;
        s.TéléphoneRespAchats = dto.TéléphoneRespAchats;
        s.EmailFacturation    = dto.EmailFacturation;
        await db.SaveChangesAsync();
        return await GetSociétéAsync(id);
    }

    public async Task DésactiverSociétéAsync(Guid id)
    {
        var s = await db.Sociétés.FindAsync(id)
            ?? throw new NotFoundException("Société", id);
        s.IsActif = false;
        await db.SaveChangesAsync();
    }

    // ── Contrats ──────────────────────────────────────────────────────────────

    public async Task<List<ContratDto>> GetContratsAsync(Guid sociétéId)
    {
        return await db.Contrats
            .Where(c => c.SociétéId == sociétéId)
            .OrderByDescending(c => c.DateDébut)
            .AsNoTracking()
            .Select(c => MapContrat(c))
            .ToListAsync();
    }

    public async Task<ContratDto> GetContratActifAsync(Guid sociétéId)
    {
        var today = DateTime.UtcNow.Date;
        var c = await db.Contrats
            .Where(c => c.SociétéId == sociétéId && c.IsActif &&
                        c.DateDébut <= today &&
                        (c.DateFin == null || c.DateFin >= today))
            .AsNoTracking()
            .FirstOrDefaultAsync()
            ?? throw new NotFoundException("Contrat actif", sociétéId);
        return MapContrat(c);
    }

    public async Task<ContratDto> CréerContratAsync(Guid sociétéId, CreateContratDto dto)
    {
        if (!await db.Sociétés.AnyAsync(s => s.Id == sociétéId))
            throw new NotFoundException("Société", sociétéId);

        if (dto.RemisePourcentage is < 0 or > 100)
            throw new BusinessRuleException("La remise doit être entre 0 et 100 %.");

        // Archiver l'ancien contrat actif
        var anciens = await db.Contrats
            .Where(c => c.SociétéId == sociétéId && c.IsActif)
            .ToListAsync();
        anciens.ForEach(c => c.IsActif = false);

        var contrat = new Contrat
        {
            SociétéId             = sociétéId,
            DateDébut             = dto.DateDébut,
            DateFin               = dto.DateFin,
            TypeTarif             = dto.TypeTarif,
            PlafondMensuelDZD     = dto.PlafondMensuelDZD,
            RemisePourcentage     = dto.RemisePourcentage,
            ConditionsParticulières = dto.ConditionsParticulières,
            IsActif               = true,
        };
        db.Contrats.Add(contrat);
        await db.SaveChangesAsync();
        return MapContrat(contrat);
    }

    // ── Flotte ────────────────────────────────────────────────────────────────

    public async Task<List<VéhiculeSociétéDto>> GetFlotteAsync(Guid sociétéId)
    {
        if (!await db.Sociétés.AnyAsync(s => s.Id == sociétéId))
            throw new NotFoundException("Société", sociétéId);

        var today = DateTime.UtcNow;
        var debutMois = new DateTime(today.Year, today.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var affectations = await db.VéhiculesSociété
            .Where(vs => vs.SociétéId == sociétéId && vs.IsActif)
            .Include(vs => vs.Vehicule)
            .AsNoTracking()
            .ToListAsync();

        var véhiculeIds = affectations.Select(a => a.VéhiculeId).ToList();

        // Stats OR du mois courant
        var statsMois = await db.OrdresReparation
            .Where(o => véhiculeIds.Contains(o.VehiculeId) &&
                        o.DateOuverture >= debutMois &&
                        o.Statut != ORStatut.Annulé)
            .GroupBy(o => o.VehiculeId)
            .Select(g => new { VéhiculeId = g.Key, Nb = g.Count(), Montant = g.Sum(o => o.MontantTotal) })
            .ToListAsync();

        return affectations.Select(a =>
        {
            var stats = statsMois.FirstOrDefault(s => s.VéhiculeId == a.VéhiculeId);
            return new VéhiculeSociétéDto(
                a.Id, a.VéhiculeId,
                a.Vehicule.Immatriculation, a.Vehicule.Marque,
                a.Vehicule.Modele, a.Vehicule.Année,
                a.NuméroFlotte, a.ConducteurHabituel, a.DateAffectation,
                stats?.Nb ?? 0, stats?.Montant ?? 0m
            );
        }).ToList();
    }

    public async Task<VéhiculeSociétéDto> AffecterVéhiculeAsync(Guid sociétéId, AffecterVéhiculeDto dto)
    {
        var société = await db.Sociétés.FindAsync(sociétéId)
            ?? throw new NotFoundException("Société", sociétéId);

        Vehicule vehicule;

        if (dto.VéhiculeId.HasValue)
        {
            vehicule = await db.Vehicules.FindAsync(dto.VéhiculeId.Value)
                ?? throw new NotFoundException("Véhicule", dto.VéhiculeId.Value);
        }
        else
        {
            if (string.IsNullOrWhiteSpace(dto.Immatriculation))
                throw new BusinessRuleException("Immatriculation requise pour créer un nouveau véhicule.");
            if (string.IsNullOrWhiteSpace(dto.Marque) || string.IsNullOrWhiteSpace(dto.Modele))
                throw new BusinessRuleException("Marque et Modèle requis.");
            if (await db.Vehicules.AnyAsync(v => v.Immatriculation == dto.Immatriculation))
                throw new ConflictException($"L'immatriculation '{dto.Immatriculation}' existe déjà.");

            // Le véhicule flotte est rattaché à une société-cliente fictive
            // On crée le véhicule sans client pour simplifier
            vehicule = new Vehicule
            {
                Immatriculation = dto.Immatriculation,
                Marque          = dto.Marque,
                Modele          = dto.Modele,
                Année           = dto.Année ?? DateTime.UtcNow.Year,
                ClientId        = await GetOrCreateClientFlotteAsync(société),
            };
            db.Vehicules.Add(vehicule);
        }

        // Vérifier que pas déjà dans la flotte
        if (await db.VéhiculesSociété.AnyAsync(vs =>
                vs.SociétéId == sociétéId && vs.VéhiculeId == vehicule.Id && vs.IsActif))
            throw new ConflictException("Ce véhicule est déjà dans la flotte active.");

        var affectation = new VéhiculeSociété
        {
            SociétéId          = sociétéId,
            VéhiculeId         = vehicule.Id,
            NuméroFlotte       = dto.NuméroFlotte,
            ConducteurHabituel = dto.ConducteurHabituel,
            DateAffectation    = DateTime.UtcNow,
        };
        db.VéhiculesSociété.Add(affectation);
        await db.SaveChangesAsync();

        return new VéhiculeSociétéDto(
            affectation.Id, vehicule.Id,
            vehicule.Immatriculation, vehicule.Marque, vehicule.Modele, vehicule.Année,
            affectation.NuméroFlotte, affectation.ConducteurHabituel,
            affectation.DateAffectation, 0, 0m
        );
    }

    public async Task RetirerVéhiculeAsync(Guid sociétéId, Guid véhiculeId)
    {
        var aff = await db.VéhiculesSociété
            .FirstOrDefaultAsync(vs => vs.SociétéId == sociétéId && vs.VéhiculeId == véhiculeId && vs.IsActif)
            ?? throw new NotFoundException("Véhicule dans la flotte", véhiculeId);

        aff.IsActif      = false;
        aff.DateRetrait  = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }

    // ── OR du mois (flotte) ───────────────────────────────────────────────────

    public async Task<List<ORFlotteDto>> GetORDuMoisAsync(Guid sociétéId, int mois, int année)
    {
        var début = new DateTime(année, mois, 1, 0, 0, 0, DateTimeKind.Utc);
        var fin   = début.AddMonths(1);

        var véhiculeIds = await db.VéhiculesSociété
            .Where(vs => vs.SociétéId == sociétéId)
            .Select(vs => vs.VéhiculeId)
            .ToListAsync();

        var numFlotte = await db.VéhiculesSociété
            .Where(vs => vs.SociétéId == sociétéId)
            .ToDictionaryAsync(vs => vs.VéhiculeId, vs => vs.NuméroFlotte);

        return await db.OrdresReparation
            .Where(o => véhiculeIds.Contains(o.VehiculeId) &&
                        o.DateOuverture >= début && o.DateOuverture < fin &&
                        o.Statut != ORStatut.Annulé)
            .Include(o => o.Vehicule)
            .AsNoTracking()
            .Select(o => new ORFlotteDto(
                o.Id, o.Numéro,
                o.Vehicule.Immatriculation,
                numFlotte.ContainsKey(o.VehiculeId) ? numFlotte[o.VehiculeId] : null,
                o.DateOuverture,
                o.TypeIntervention.ToString(),
                o.Statut.ToString(),
                o.MontantTotal,
                o.FactureGroupéeId != null
            ))
            .ToListAsync();
    }

    // ── Facturation groupée ───────────────────────────────────────────────────

    public async Task<PreviewFactureGroupéeDto> PreviewFactureGroupéeAsync(Guid sociétéId, int mois, int année)
    {
        var (ors, contrat) = await GetORsÉligiblesAsync(sociétéId, mois, année, null);
        return BuildPreview(ors, contrat);
    }

    public async Task<FactureGroupéeDetailDto> CréerFactureGroupéeAsync(Guid sociétéId, CréerFactureGroupéeDto dto)
    {
        var société = await db.Sociétés.FindAsync(sociétéId)
            ?? throw new NotFoundException("Société", sociétéId);

        var (ors, contrat) = await GetORsÉligiblesAsync(sociétéId, dto.Mois, dto.Année, dto.OrIds);

        if (ors.Count == 0)
            throw new BusinessRuleException("Aucun OR éligible pour cette période.");

        var numéro = await GenerateNuméroFactureGroupéeAsync(dto.Année);

        var lignes = new List<LigneFactureGroupée>();
        decimal sousTotalHT = 0;

        // Numéros de flotte pour les lignes
        var numFlotte = await db.VéhiculesSociété
            .Where(vs => vs.SociétéId == sociétéId)
            .ToDictionaryAsync(vs => vs.VéhiculeId, vs => vs.NuméroFlotte);

        foreach (var or in ors)
        {
            var (ht, ttc, tarifAppliqué) = contrat is not null
                ? TarifContratService.AppliquerTarif(contrat, or.MontantTotal)
                : (or.MontantTotal, or.MontantTotal * (1 + TVA / 100m), false);

            lignes.Add(new LigneFactureGroupée
            {
                ORId             = or.Id,
                Immatriculation  = or.Vehicule.Immatriculation,
                NuméroFlotte     = numFlotte.GetValueOrDefault(or.VehiculeId),
                TypeIntervention = or.TypeIntervention.ToString(),
                DateOR           = or.DateOuverture,
                MontantHT        = ht,
                TauxTVA          = TVA,
                TotalTTC         = ttc,
                TarifAppliqué    = tarifAppliqué,
            });
            sousTotalHT += ht;
        }

        var montantTVA = Math.Round(sousTotalHT * TVA / 100m, 2);
        var totalTTC   = sousTotalHT + montantTVA;
        var dépassement = contrat?.PlafondMensuelDZD.HasValue == true &&
                          totalTTC > contrat.PlafondMensuelDZD!.Value;

        var facture = new FactureGroupée
        {
            Numéro                  = numéro,
            SociétéId               = sociétéId,
            SociétéRaisonSociale    = société.RaisonSociale,
            SociétéNIF              = société.NIF,
            SociétéAdresse          = société.AdresseSiège,
            PériodeMois             = dto.Mois,
            PériodeAnnée            = dto.Année,
            SousTotalHT             = Math.Round(sousTotalHT, 2),
            MontantTVA              = montantTVA,
            TotalTTC                = Math.Round(totalTTC, 2),
            DépassementPlafond      = dépassement,
            Lignes                  = lignes,
        };

        db.FacturesGroupées.Add(facture);

        // Marquer les OR
        foreach (var or in ors)
            or.FactureGroupéeId = facture.Id;

        await db.SaveChangesAsync();
        return await GetFactureGroupéeDetailAsync(facture.Id);
    }

    public async Task<List<FactureGroupéeSummaryDto>> GetHistoriqueFacturesGroupéesAsync(Guid sociétéId, int page, int pageSize)
    {
        return await db.FacturesGroupées
            .Where(f => f.SociétéId == sociétéId)
            .OrderByDescending(f => f.PériodeAnnée).ThenByDescending(f => f.PériodeMois)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .AsNoTracking()
            .Select(f => new FactureGroupéeSummaryDto(
                f.Id, f.Numéro, f.PériodeMois, f.PériodeAnnée,
                f.TotalTTC, f.DépassementPlafond, f.Statut.ToString(),
                f.DateFacture, f.Lignes.Count))
            .ToListAsync();
    }

    public async Task<FactureGroupéeDetailDto> GetFactureGroupéeDetailAsync(Guid factureId)
    {
        var f = await db.FacturesGroupées
            .Include(f => f.Lignes).ThenInclude(l => l.OR)
            .AsNoTracking()
            .FirstOrDefaultAsync(f => f.Id == factureId)
            ?? throw new NotFoundException("Facture groupée", factureId);

        return new FactureGroupéeDetailDto(
            f.Id, f.Numéro,
            f.SociétéRaisonSociale, f.SociétéNIF, f.SociétéAdresse,
            f.PériodeMois, f.PériodeAnnée,
            f.SousTotalHT, f.MontantTVA, f.TotalTTC,
            f.DépassementPlafond, f.Statut.ToString(), f.DateFacture,
            f.Lignes.Select(l => new LigneFactureGroupéeDto(
                l.Id, l.ORId, l.OR.Numéro,
                l.Immatriculation, l.NuméroFlotte,
                l.TypeIntervention, l.DateOR,
                l.MontantHT, l.TauxTVA, l.TotalTTC, l.TarifAppliqué
            )).ToList()
        );
    }

    // ── Helpers publics (utilisés par OrdreReparationService) ─────────────────

    /// <summary>Détecte si un véhicule appartient à une flotte et retourne le contrat actif.</summary>
    public async Task<Contrat?> GetContratActifPourVéhiculeAsync(Guid véhiculeId)
    {
        var today = DateTime.UtcNow.Date;
        var sociétéId = await db.VéhiculesSociété
            .Where(vs => vs.VéhiculeId == véhiculeId && vs.IsActif)
            .Select(vs => (Guid?)vs.SociétéId)
            .FirstOrDefaultAsync();

        if (sociétéId is null) return null;

        return await db.Contrats
            .Where(c => c.SociétéId == sociétéId &&
                        c.IsActif &&
                        c.DateDébut <= today &&
                        (c.DateFin == null || c.DateFin >= today))
            .FirstOrDefaultAsync();
    }

    // ── Privés ────────────────────────────────────────────────────────────────

    private static Contrat? ContratActifAujourdhui(IEnumerable<Contrat> contrats)
    {
        var today = DateTime.UtcNow.Date;
        return contrats.FirstOrDefault(c =>
            c.IsActif &&
            c.DateDébut <= today &&
            (c.DateFin == null || c.DateFin >= today));
    }

    private static ContratDto MapContrat(Contrat c) => new(
        c.Id, c.DateDébut, c.DateFin, c.TypeTarif,
        c.PlafondMensuelDZD, c.RemisePourcentage,
        c.ConditionsParticulières, c.IsActif, c.DateCreation);

    private async Task<(List<OrdreReparation> ORs, Contrat? Contrat)> GetORsÉligiblesAsync(
        Guid sociétéId, int mois, int année, List<Guid>? orIds)
    {
        var début = new DateTime(année, mois, 1, 0, 0, 0, DateTimeKind.Utc);
        var fin   = début.AddMonths(1);

        var véhiculeIds = await db.VéhiculesSociété
            .Where(vs => vs.SociétéId == sociétéId)
            .Select(vs => vs.VéhiculeId)
            .ToListAsync();

        var query = db.OrdresReparation
            .Include(o => o.Vehicule)
            .Where(o => véhiculeIds.Contains(o.VehiculeId) &&
                        o.Statut == ORStatut.Livré &&
                        o.DateOuverture >= début && o.DateOuverture < fin &&
                        o.FactureGroupéeId == null);

        if (orIds?.Count > 0)
            query = query.Where(o => orIds.Contains(o.Id));

        var ors = await query.ToListAsync();

        var today = DateTime.UtcNow.Date;
        var contrat = await db.Contrats
            .Where(c => c.SociétéId == sociétéId && c.IsActif &&
                        c.DateDébut <= today &&
                        (c.DateFin == null || c.DateFin >= today))
            .FirstOrDefaultAsync();

        return (ors, contrat);
    }

    private PreviewFactureGroupéeDto BuildPreview(List<OrdreReparation> ors, Contrat? contrat)
    {
        decimal sousTotalHT = 0;
        var orDtos = new List<ORFlotteDto>();

        foreach (var or in ors)
        {
            var (ht, _, _) = contrat is not null
                ? TarifContratService.AppliquerTarif(contrat, or.MontantTotal)
                : (or.MontantTotal, 0m, false);
            sousTotalHT += ht;
            orDtos.Add(new ORFlotteDto(
                or.Id, or.Numéro, or.Vehicule.Immatriculation,
                null, or.DateOuverture, or.TypeIntervention.ToString(),
                or.Statut.ToString(), or.MontantTotal, false));
        }

        var tva    = Math.Round(sousTotalHT * TVA / 100m, 2);
        var ttc    = sousTotalHT + tva;
        var dépass = contrat?.PlafondMensuelDZD.HasValue == true && ttc > contrat.PlafondMensuelDZD!.Value;

        return new PreviewFactureGroupéeDto(
            ors.Count,
            Math.Round(sousTotalHT, 2),
            tva,
            Math.Round(ttc, 2),
            dépass,
            contrat?.PlafondMensuelDZD,
            orDtos
        );
    }

    private async Task<string> GenerateNuméroFactureGroupéeAsync(int année)
    {
        var count = await db.FacturesGroupées.CountAsync(f => f.PériodeAnnée == année);
        return $"FAC-SOC-{année}-{(count + 1):D4}";
    }

    private async Task<Guid> GetOrCreateClientFlotteAsync(Société société)
    {
        // Cherche un client "société" déjà lié
        var existing = await db.Clients
            .Where(c => c.Email == société.EmailFacturation && !c.IsDeleted)
            .Select(c => c.Id)
            .FirstOrDefaultAsync();

        if (existing != Guid.Empty) return existing;

        var client = new Client
        {
            Type          = ClientType.Société,
            Nom           = société.RaisonSociale,
            RaisonSociale = société.RaisonSociale,
            Téléphone     = société.TéléphoneRespAchats,
            Email         = société.EmailFacturation,
            Adresse       = société.AdresseSiège,
            Wilaya        = Wilaya.Alger,
            IsActif       = true,
        };
        db.Clients.Add(client);
        await db.SaveChangesAsync();
        return client.Id;
    }
}
