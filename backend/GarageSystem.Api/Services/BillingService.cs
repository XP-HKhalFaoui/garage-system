using GarageSystem.Api.DTOs.Billing;
using GarageSystem.Domain.Entities;
using GarageSystem.Domain.Enums;
using GarageSystem.Domain.Exceptions;
using GarageSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GarageSystem.Api.Services;

public class BillingService(ApplicationDbContext db)
{
    private const decimal TauxTVA = 19m;

    // ═══════════════════════════════════════════════════════════════════════════
    // DEVIS
    // ═══════════════════════════════════════════════════════════════════════════

    public async Task<DevisResponseDto> CreateDevisFromORAsync(Guid orId)
    {
        var or = await db.OrdresReparation
            .Include(o => o.Vehicule).ThenInclude(v => v.Client)
            .Include(o => o.Lignes).ThenInclude(l => l.Article)
            .FirstOrDefaultAsync(o => o.Id == orId)
            ?? throw new NotFoundException(nameof(OrdreReparation), orId);

        var existing = await db.Devis
            .AnyAsync(d => d.ORId == orId
                        && d.Statut != DevisStatut.Refusé
                        && d.Statut != DevisStatut.Expiré);
        if (existing)
            throw new ConflictException("Un devis actif existe déjà pour cet OR.");

        var numéro = await GenerateDevisNuméroAsync();

        var lignes = or.Lignes.Select(l => new LigneDevis
        {
            Description    = l.Type == LigneORType.Pièce && l.Article is not null
                             ? $"[{l.Article.Référence}] {l.Description}"
                             : l.Description,
            Quantité       = l.Quantité,
            PrixUnitaireHT = l.PrixUnitaire,
            TauxTVA        = TauxTVA,
        }).ToList();

        var sousTotalHT  = lignes.Sum(l => l.Quantité * l.PrixUnitaireHT);
        var montantTVA   = Math.Round(sousTotalHT * TauxTVA / 100, 2);
        var totalTTC     = sousTotalHT + montantTVA;

        var devis = new Devis
        {
            Numéro         = numéro,
            ORId           = orId,
            ClientId       = or.Vehicule.Client.Id,
            Statut         = DevisStatut.Brouillon,
            DateExpiration = DateTime.UtcNow.AddDays(30),
            SousTotalHT    = sousTotalHT,
            MontantTVA     = montantTVA,
            TotalTTC       = totalTTC,
            Lignes         = lignes,
        };

        db.Devis.Add(devis);
        await db.SaveChangesAsync();
        return await GetDevisAsync(devis.Id);
    }

    public async Task<DevisResponseDto> GetDevisAsync(Guid id)
    {
        var devis = await db.Devis
            .Include(d => d.Lignes)
            .FirstOrDefaultAsync(d => d.Id == id)
            ?? throw new NotFoundException(nameof(Devis), id);

        var client = await db.Clients.FindAsync(devis.ClientId);
        var clientNom = client is null ? "" :
            client.Type == ClientType.Société
            ? client.RaisonSociale ?? client.Nom
            : $"{client.Nom} {client.Prénom}".Trim();

        return MapDevisResponse(devis, clientNom);
    }

    public async Task<List<DevisResponseDto>> GetDevisListAsync(
        Guid? orId, Guid? clientId, DevisStatut? statut, int page, int pageSize)
    {
        var q = db.Devis.Include(d => d.Lignes).AsQueryable();
        if (orId.HasValue)      q = q.Where(d => d.ORId == orId.Value);
        if (clientId.HasValue)  q = q.Where(d => d.ClientId == clientId.Value);
        if (statut.HasValue)    q = q.Where(d => d.Statut == statut.Value);

        var list = await q.OrderByDescending(d => d.DateCreation)
                          .Skip((page - 1) * pageSize).Take(pageSize)
                          .ToListAsync();

        var clientIds = list.Select(d => d.ClientId).Distinct().ToList();
        var clients   = await db.Clients.Where(c => clientIds.Contains(c.Id)).ToListAsync();

        return list.Select(d =>
        {
            var c = clients.FirstOrDefault(c => c.Id == d.ClientId);
            var nom = c is null ? "" :
                c.Type == ClientType.Société ? c.RaisonSociale ?? c.Nom
                : $"{c.Nom} {c.Prénom}".Trim();
            return MapDevisResponse(d, nom);
        }).ToList();
    }

    // Transitions ──────────────────────────────────────────────────────────────
    public async Task<DevisResponseDto> ValiderDevisAsync(Guid id)
        => await TransitionDevisAsync(id, DevisStatut.Brouillon, DevisStatut.Validé);

    public async Task<DevisResponseDto> EnvoyerDevisAsync(Guid id)
    {
        var devis = await LoadDevisOrThrow(id);
        if (devis.Statut != DevisStatut.Validé)
            throw new BusinessRuleException($"Seul un devis Validé peut être envoyé (actuel : {devis.Statut}).");
        devis.Statut    = DevisStatut.EnvoyéClient;
        devis.DateEnvoi = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return await GetDevisAsync(id);
    }

    public async Task<DevisResponseDto> AccepterDevisAsync(Guid id)
        => await TransitionDevisAsync(id, DevisStatut.EnvoyéClient, DevisStatut.Accepté);

    public async Task<DevisResponseDto> RefuserDevisAsync(Guid id, string motif)
    {
        var devis = await LoadDevisOrThrow(id);
        if (devis.Statut is DevisStatut.Refusé or DevisStatut.Expiré)
            throw new BusinessRuleException("Ce devis est déjà clôturé.");
        devis.Statut      = DevisStatut.Refusé;
        devis.MotifRefus  = motif;
        await db.SaveChangesAsync();
        return await GetDevisAsync(id);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FACTURES
    // ═══════════════════════════════════════════════════════════════════════════

    public async Task<FactureResponseDto> CreateFactureFromDevisAsync(Guid devisId)
    {
        var devis = await db.Devis
            .Include(d => d.Lignes)
            .FirstOrDefaultAsync(d => d.Id == devisId)
            ?? throw new NotFoundException(nameof(Devis), devisId);

        if (devis.Statut != DevisStatut.Accepté)
            throw new BusinessRuleException($"Le devis doit être Accepté (actuel : {devis.Statut}).");

        var or = await db.OrdresReparation
            .Include(o => o.Vehicule).ThenInclude(v => v.Client)
            .FirstOrDefaultAsync(o => o.Id == devis.ORId)
            ?? throw new NotFoundException(nameof(OrdreReparation), devis.ORId);

        if (or.Statut != ORStatut.TerminéTechnicien)
            throw new ConflictException($"L'OR doit être TerminéTechnicien pour facturer (actuel : {or.Statut}).");

        if (await db.Factures.AnyAsync(f => f.DevisId == devisId))
            throw new ConflictException("Une facture existe déjà pour ce devis.");

        await using var tx = await db.Database.BeginTransactionAsync();
        try
        {
            var numéro = await GenerateFactureNuméroAsync();
            var client = or.Vehicule.Client;

            var lignes = devis.Lignes.Select(l => new LigneFacture
            {
                Description    = l.Description,
                Quantité       = l.Quantité,
                PrixUnitaireHT = l.PrixUnitaireHT,
                TauxTVA        = l.TauxTVA,
            }).ToList();

            var facture = new Facture
            {
                Numéro         = numéro,
                ORId           = or.Id,
                DevisId        = devisId,
                ClientNom      = client.Type == ClientType.Société
                                 ? client.RaisonSociale ?? client.Nom
                                 : $"{client.Nom} {client.Prénom}".Trim(),
                ClientAdresse  = client.Adresse,
                ClientNIF      = client.NIF,
                DateFacture    = DateTime.UtcNow,
                DateEchéance   = DateTime.UtcNow.AddDays(30),
                SousTotalHT    = devis.SousTotalHT,
                MontantTVA     = devis.MontantTVA,
                TotalTTC       = devis.TotalTTC,
                Statut         = FactureStatut.Émise,
                Lignes         = lignes,
            };

            db.Factures.Add(facture);
            await db.SaveChangesAsync();

            // Lier la facture à l'OR et le passer à Livré
            or.FactureId = facture.Id;
            or.Statut    = ORStatut.Livré;
            or.DateFermeture = DateTime.UtcNow;

            // Mettre à jour le véhicule
            or.Vehicule.DateDernièreVisite = DateTime.UtcNow;

            await db.SaveChangesAsync();
            await tx.CommitAsync();
            return await GetFactureAsync(facture.Id);
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task<FactureResponseDto> CreateFactureFromORAsync(Guid orId)
    {
        var or = await db.OrdresReparation
            .Include(o => o.Vehicule).ThenInclude(v => v.Client)
            .Include(o => o.Lignes).ThenInclude(l => l.Article)
            .FirstOrDefaultAsync(o => o.Id == orId)
            ?? throw new NotFoundException(nameof(OrdreReparation), orId);

        if (or.Statut != ORStatut.TerminéTechnicien)
            throw new BusinessRuleException($"L'OR doit être TerminéTechnicien pour générer une facture (actuel : {or.Statut}).");

        if (await db.Factures.AnyAsync(f => f.ORId == orId))
            throw new ConflictException("Une facture existe déjà pour cet OR.");

        await using var tx = await db.Database.BeginTransactionAsync();
        try
        {
            var numéro = await GenerateFactureNuméroAsync();
            var client = or.Vehicule.Client;

            var lignes = or.Lignes.Select(l => new LigneFacture
            {
                Description    = l.Type == LigneORType.Pièce && l.Article is not null
                                 ? $"[{l.Article.Référence}] {l.Description}"
                                 : l.Description,
                Quantité       = l.Quantité,
                PrixUnitaireHT = l.PrixUnitaire,
                TauxTVA        = TauxTVA,
            }).ToList();

            var sousTotalHT = lignes.Sum(l => l.Quantité * l.PrixUnitaireHT);
            var montantTVA  = Math.Round(sousTotalHT * TauxTVA / 100, 2);
            var totalTTC    = sousTotalHT + montantTVA;

            var facture = new Facture
            {
                Numéro        = numéro,
                ORId          = or.Id,
                ClientNom     = client.Type == ClientType.Société
                                ? client.RaisonSociale ?? client.Nom
                                : $"{client.Nom} {client.Prénom}".Trim(),
                ClientAdresse = client.Adresse,
                ClientNIF     = client.NIF,
                DateFacture   = DateTime.UtcNow,
                DateEchéance  = DateTime.UtcNow.AddDays(30),
                SousTotalHT   = sousTotalHT,
                MontantTVA    = montantTVA,
                TotalTTC      = totalTTC,
                Statut        = FactureStatut.Émise,
                Lignes        = lignes,
            };

            db.Factures.Add(facture);
            await db.SaveChangesAsync();

            or.FactureId     = facture.Id;
            or.Statut        = ORStatut.Livré;
            or.DateFermeture = DateTime.UtcNow;
            or.Vehicule.DateDernièreVisite = DateTime.UtcNow;

            await db.SaveChangesAsync();
            await tx.CommitAsync();
            return await GetFactureAsync(facture.Id);
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task<FactureResponseDto> GetFactureAsync(Guid id)
    {
        var f = await db.Factures
            .Include(f => f.Lignes)
            .Include(f => f.Paiements)
            .FirstOrDefaultAsync(f => f.Id == id)
            ?? throw new NotFoundException(nameof(Facture), id);

        string? immat = null;
        if (f.ORId.HasValue)
        {
            immat = await db.OrdresReparation
                .Where(o => o.Id == f.ORId.Value)
                .Select(o => o.Vehicule.Immatriculation)
                .FirstOrDefaultAsync();
        }

        return MapFactureResponse(f, immat);
    }

    public async Task<(List<FactureSummaryDto> Items, int Total)> GetFacturesListAsync(
        FactureStatut? statut, Guid? clientId, DateTime? dateFrom, DateTime? dateTo,
        int page, int pageSize)
    {
        var q = db.Factures.Include(f => f.Paiements).AsQueryable();

        if (statut.HasValue)    q = q.Where(f => f.Statut == statut.Value);
        if (dateFrom.HasValue)  q = q.Where(f => f.DateFacture >= dateFrom.Value);
        if (dateTo.HasValue)    q = q.Where(f => f.DateFacture <= dateTo.Value);

        // Filtre par clientId : chercher dans les OR associés
        if (clientId.HasValue)
        {
            var orIds = await db.OrdresReparation
                .Where(o => o.Vehicule.ClientId == clientId.Value)
                .Select(o => o.Id)
                .ToListAsync();
            q = q.Where(f => f.ORId.HasValue && orIds.Contains(f.ORId.Value));
        }

        var total = await q.CountAsync();
        var list = await q.OrderByDescending(f => f.DateFacture)
                          .Skip((page - 1) * pageSize).Take(pageSize)
                          .ToListAsync();

        // Charger les immatriculations en une seule requête
        var orIdList = list.Where(f => f.ORId.HasValue).Select(f => f.ORId!.Value).ToList();
        var immats = await db.OrdresReparation
            .Where(o => orIdList.Contains(o.Id))
            .Select(o => new { o.Id, o.Vehicule.Immatriculation })
            .ToDictionaryAsync(x => x.Id, x => x.Immatriculation);

        var today = DateTime.UtcNow;
        var summaries = list.Select(f =>
        {
            var restant = f.TotalTTC - f.MontantDéjàPayé;
            immats.TryGetValue(f.ORId ?? Guid.Empty, out var immat);
            return new FactureSummaryDto(
                f.Id, f.Numéro, f.Statut,
                f.DateFacture, f.DateEchéance,
                f.ClientNom, immat,
                f.TotalTTC, f.MontantDéjàPayé, restant,
                f.Statut == FactureStatut.Émise && f.DateEchéance < today);
        }).ToList();

        return (summaries, total);
    }

    public async Task<FactureResponseDto> EnregistrerPaiementAsync(Guid factureId, EnregistrerPaiementDto dto, string userId)
    {
        await using var tx = await db.Database.BeginTransactionAsync();
        try
        {
            var facture = await db.Factures.FindAsync(factureId)
                ?? throw new NotFoundException(nameof(Facture), factureId);

            if (facture.Statut is not (FactureStatut.Émise or FactureStatut.PartiellemntPayée))
                throw new ConflictException($"Impossible d'enregistrer un paiement sur une facture {facture.Statut}.");

            var restant = facture.TotalTTC - facture.MontantDéjàPayé;
            if (dto.Montant <= 0 || dto.Montant > restant)
                throw new BusinessRuleException(
                    $"Montant invalide. Le restant dû est de {restant:N2} DA.");

            if (dto.DatePaiement > DateTime.UtcNow.Date.AddDays(1))
                throw new BusinessRuleException("La date de paiement ne peut pas être dans le futur.");

            db.Paiements.Add(new Paiement
            {
                FactureId     = factureId,
                Montant       = dto.Montant,
                ModePaiement  = dto.ModePaiement,
                Référence     = dto.Référence,
                DatePaiement  = dto.DatePaiement,
                UserId        = userId,
            });

            facture.MontantDéjàPayé += dto.Montant;
            facture.Statut = facture.MontantDéjàPayé >= facture.TotalTTC
                ? FactureStatut.Soldée
                : FactureStatut.PartiellemntPayée;

            if (facture.Statut == FactureStatut.Soldée)
                facture.DateSolde = DateTime.UtcNow;

            await db.SaveChangesAsync();
            await tx.CommitAsync();
            return await GetFactureAsync(factureId);
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    public async Task AnnulerFactureAsync(Guid id, string motif)
    {
        var f = await db.Factures.FindAsync(id)
            ?? throw new NotFoundException(nameof(Facture), id);

        if (f.Statut == FactureStatut.Annulée)
            throw new BusinessRuleException("Cette facture est déjà annulée.");

        f.Statut           = FactureStatut.Annulée;
        f.MotifsAnnulation = motif;
        await db.SaveChangesAsync();
    }

    public async Task<List<PaiementDto>> GetPaiementsAsync(Guid factureId)
    {
        if (!await db.Factures.AnyAsync(f => f.Id == factureId))
            throw new NotFoundException(nameof(Facture), factureId);

        return await db.Paiements
            .Where(p => p.FactureId == factureId)
            .OrderBy(p => p.DatePaiement)
            .Select(p => new PaiementDto(p.Id, p.Montant, p.ModePaiement, p.Référence, p.DatePaiement))
            .ToListAsync();
    }

    public async Task<RecapCaisseDto> GetRecapCaisseAsync()
    {
        var today = DateTime.UtcNow.Date;
        var paiements = await db.Paiements
            .Where(p => p.DatePaiement.Date == today)
            .ToListAsync();

        var soldées = await db.Factures
            .CountAsync(f => f.Statut == FactureStatut.Soldée && f.DateSolde.HasValue
                           && f.DateSolde.Value.Date == today);

        return new RecapCaisseDto(
            paiements.Where(p => p.ModePaiement == ModePaiement.Espèces).Sum(p => p.Montant),
            paiements.Where(p => p.ModePaiement == ModePaiement.Virement).Sum(p => p.Montant),
            paiements.Where(p => p.ModePaiement == ModePaiement.Chèque).Sum(p => p.Montant),
            paiements.Where(p => p.ModePaiement == ModePaiement.CB).Sum(p => p.Montant),
            paiements.Sum(p => p.Montant),
            soldées);
    }

    public async Task<StatsBillingDto> GetStatsBillingAsync()
    {
        var now        = DateTime.UtcNow;
        var debutMois  = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var today      = now.Date;

        var factures = await db.Factures
            .Where(f => f.Statut != FactureStatut.Annulée && f.DateFacture >= debutMois)
            .ToListAsync();

        var caMois     = factures.Sum(f => f.TotalTTC);
        var encaissé   = factures.Sum(f => f.MontantDéjàPayé);
        var reste      = factures.Sum(f => f.TotalTTC - f.MontantDéjàPayé);
        var retard     = await db.Factures
            .CountAsync(f => f.Statut == FactureStatut.Émise && f.DateEchéance < today);

        return new StatsBillingDto(caMois, encaissé, reste, retard);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PDF — délégué à PdfService, le service retourne juste les données
    // ═══════════════════════════════════════════════════════════════════════════

    public async Task<(Facture Facture, string? Immatriculation)> GetFacturePdfDataAsync(Guid id)
    {
        var f = await db.Factures
            .Include(f => f.Lignes)
            .Include(f => f.Paiements)
            .FirstOrDefaultAsync(f => f.Id == id)
            ?? throw new NotFoundException(nameof(Facture), id);

        string? immat = null;
        if (f.ORId.HasValue)
            immat = await db.OrdresReparation
                .Where(o => o.Id == f.ORId.Value)
                .Select(o => o.Vehicule.Immatriculation)
                .FirstOrDefaultAsync();

        return (f, immat);
    }

    public async Task<(Devis Devis, string ClientNom, string ClientAdresse, string? ClientNIF)> GetDevisPdfDataAsync(Guid id)
    {
        var d = await db.Devis
            .Include(d => d.Lignes)
            .FirstOrDefaultAsync(d => d.Id == id)
            ?? throw new NotFoundException(nameof(Devis), id);

        var client = await db.Clients.FindAsync(d.ClientId)
            ?? throw new NotFoundException(nameof(Client), d.ClientId);

        var nom = client.Type == ClientType.Société
            ? client.RaisonSociale ?? client.Nom
            : $"{client.Nom} {client.Prénom}".Trim();

        return (d, nom, client.Adresse, client.NIF);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HELPERS PRIVÉS
    // ═══════════════════════════════════════════════════════════════════════════

    private async Task<string> GenerateDevisNuméroAsync()
    {
        var year = DateTime.UtcNow.Year;
        var count = await db.Devis.CountAsync(d => d.DateCreation.Year == year);
        return $"DEV-{year}-{(count + 1):D4}";
    }

    private async Task<string> GenerateFactureNuméroAsync()
    {
        var year = DateTime.UtcNow.Year;
        var count = await db.Factures.CountAsync(f => f.DateCreation.Year == year);
        return $"FAC-{year}-{(count + 1):D4}";
    }

    private async Task<Devis> LoadDevisOrThrow(Guid id)
        => await db.Devis.FindAsync(id)
           ?? throw new NotFoundException(nameof(Devis), id);

    private async Task<DevisResponseDto> TransitionDevisAsync(Guid id, DevisStatut from, DevisStatut to)
    {
        var devis = await LoadDevisOrThrow(id);
        if (devis.Statut != from)
            throw new BusinessRuleException(
                $"Transition impossible : statut actuel {devis.Statut}, attendu {from}.");
        devis.Statut = to;
        await db.SaveChangesAsync();
        return await GetDevisAsync(id);
    }

    private static DevisResponseDto MapDevisResponse(Devis d, string clientNom) => new(
        d.Id, d.Numéro, d.Statut, d.DateCreation, d.DateExpiration, d.DateEnvoi,
        d.ORId, d.ClientId, clientNom,
        d.SousTotalHT, d.MontantTVA, d.TotalTTC,
        d.Lignes.Select(l => new LigneDevisDto(
            l.Id, l.Description, l.Quantité, l.PrixUnitaireHT, l.TauxTVA,
            l.Quantité * l.PrixUnitaireHT,
            l.Quantité * l.PrixUnitaireHT * (1 + l.TauxTVA / 100))).ToList());

    private static FactureResponseDto MapFactureResponse(Facture f, string? immat) => new(
        f.Id, f.Numéro, f.Statut,
        f.DateFacture, f.DateEchéance, f.DateSolde,
        f.ClientNom, f.ClientAdresse, f.ClientNIF,
        f.SousTotalHT, f.MontantTVA, f.TotalTTC,
        f.MontantDéjàPayé, f.TotalTTC - f.MontantDéjàPayé,
        f.Lignes.Select(l => new LigneFactureDto(
            l.Id, l.Description, l.Quantité, l.PrixUnitaireHT, l.TauxTVA,
            l.TotalHT, l.TotalTTC)).ToList(),
        f.Paiements.Select(p => new PaiementDto(
            p.Id, p.Montant, p.ModePaiement, p.Référence, p.DatePaiement)).ToList());
}
