using GarageSystem.Api.DTOs.RH;
using GarageSystem.Domain.Entities;
using GarageSystem.Domain.Enums;
using GarageSystem.Domain.Exceptions;
using GarageSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GarageSystem.Api.Services;

public class RHService(ApplicationDbContext db)
{
    // ═══════════════════════════════════════════════════════════════════════════
    // EMPLOYÉS
    // ═══════════════════════════════════════════════════════════════════════════

    public async Task<(List<EmployeResponseDto> Items, int Total)> GetEmployesAsync(
        TypePoste? poste, string? département, bool? actif, int page, int pageSize, bool canSeeSalary)
    {
        var q = db.Employes.Include(e => e.OrdresAssignés).AsQueryable();
        if (poste.HasValue)         q = q.Where(e => e.Poste == poste.Value);
        if (!string.IsNullOrEmpty(département)) q = q.Where(e => e.Département == département);
        if (actif.HasValue)         q = q.Where(e => e.IsActif == actif.Value);

        var total = await q.CountAsync();
        var list  = await q.OrderBy(e => e.Nom).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return (list.Select(e => MapEmploye(e, canSeeSalary)).ToList(), total);
    }

    public async Task<EmployeResponseDto> GetEmployeAsync(Guid id, bool canSeeSalary)
    {
        var e = await db.Employes.Include(e => e.OrdresAssignés)
                        .FirstOrDefaultAsync(e => e.Id == id)
            ?? throw new NotFoundException(nameof(Employe), id);
        return MapEmploye(e, canSeeSalary);
    }

    public async Task<EmployeResponseDto> CreateEmployeAsync(CreateEmployeDto dto)
    {
        var e = new Employe
        {
            Nom = dto.Nom, Prénom = dto.Prénom,
            DateNaissance = dto.DateNaissance,
            Téléphone = dto.Téléphone, Email = dto.Email, Adresse = dto.Adresse,
            Poste = dto.Poste, Département = dto.Département,
            SalaireBase = dto.SalaireBase, TypeContrat = dto.TypeContrat,
            DateEmbauche = dto.DateEmbauche, DateFinContrat = dto.DateFinContrat,
            IsActif = true,
        };
        db.Employes.Add(e);
        await db.SaveChangesAsync();
        return await GetEmployeAsync(e.Id, true);
    }

    public async Task<EmployeResponseDto> UpdateEmployeAsync(Guid id, UpdateEmployeDto dto)
    {
        var e = await db.Employes.FindAsync(id) ?? throw new NotFoundException(nameof(Employe), id);
        e.Nom = dto.Nom; e.Prénom = dto.Prénom;
        e.Téléphone = dto.Téléphone; e.Email = dto.Email; e.Adresse = dto.Adresse;
        e.Poste = dto.Poste; e.Département = dto.Département;
        e.SalaireBase = dto.SalaireBase; e.TypeContrat = dto.TypeContrat;
        e.DateFinContrat = dto.DateFinContrat;
        await db.SaveChangesAsync();
        return await GetEmployeAsync(id, true);
    }

    public async Task DesactiverAsync(Guid id)
    {
        var e = await db.Employes.FindAsync(id) ?? throw new NotFoundException(nameof(Employe), id);
        e.IsActif = false;
        await db.SaveChangesAsync();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // POINTAGE
    // ═══════════════════════════════════════════════════════════════════════════

    public async Task<PointageResponseDto> EnregistrerEntréeAsync(Guid employeId)
    {
        var employe = await db.Employes.FindAsync(employeId)
            ?? throw new NotFoundException(nameof(Employe), employeId);

        var today = DateOnly.FromDateTime(DateTime.Now);
        if (await db.Pointages.AnyAsync(p => p.EmployeId == employeId && p.Date == today))
            throw new ConflictException("Une entrée existe déjà pour cet employé aujourd'hui.");

        var p = new Pointage
        {
            EmployeId = employeId,
            Date = today,
            HeureEntrée = TimeOnly.FromDateTime(DateTime.Now),
            TypeJour = TypeJour.Travaillé,
        };
        db.Pointages.Add(p);
        await db.SaveChangesAsync();
        return MapPointage(p, $"{employe.Prénom} {employe.Nom}");
    }

    public async Task<PointageResponseDto> EnregistrerSortieAsync(Guid employeId)
    {
        var employe = await db.Employes.FindAsync(employeId)
            ?? throw new NotFoundException(nameof(Employe), employeId);

        var today = DateOnly.FromDateTime(DateTime.Now);
        var p = await db.Pointages
            .FirstOrDefaultAsync(p => p.EmployeId == employeId && p.Date == today && p.HeureSortie == null)
            ?? throw new NotFoundException("Pointage en cours", employeId);

        var sortie = TimeOnly.FromDateTime(DateTime.Now);
        p.HeureSortie = sortie;
        p.NbHeuresTravaillées = (decimal)(sortie - p.HeureEntrée).TotalHours;
        p.NbHeuresSup = Math.Max(0, p.NbHeuresTravaillées - 8);
        await db.SaveChangesAsync();
        return MapPointage(p, $"{employe.Prénom} {employe.Nom}");
    }

    public async Task<List<PointageResponseDto>> GetPointageAsync(Guid? employeId, string? mois)
    {
        var q = db.Pointages.Include(p => p.Employe).AsQueryable();
        if (employeId.HasValue) q = q.Where(p => p.EmployeId == employeId.Value);
        if (!string.IsNullOrEmpty(mois) && DateTime.TryParse(mois + "-01", out var d))
        {
            var debut = DateOnly.FromDateTime(d);
            var fin   = DateOnly.FromDateTime(d.AddMonths(1).AddDays(-1));
            q = q.Where(p => p.Date >= debut && p.Date <= fin);
        }
        var list = await q.OrderBy(p => p.Date).ToListAsync();
        return list.Select(p => MapPointage(p, $"{p.Employe.Prénom} {p.Employe.Nom}")).ToList();
    }

    public async Task<PrésentAujourdHuiDto> GetPrésentAujourdHuiAsync()
    {
        var today = DateOnly.FromDateTime(DateTime.Now);
        var pointages = await db.Pointages
            .Include(p => p.Employe)
            .Where(p => p.Date == today)
            .ToListAsync();

        var tousTechniciens = await db.Employes
            .Where(e => e.IsActif)
            .Select(e => new EmployeSummaryDto(e.Id, $"{e.Prénom} {e.Nom}", e.Poste, e.IsActif))
            .ToListAsync();

        var présentsIds = pointages.Select(p => p.EmployeId).ToHashSet();
        var présents = pointages.Select(p => new EmployéPrésentDto(
            p.EmployeId, $"{p.Employe.Prénom} {p.Employe.Nom}", p.HeureEntrée)).ToList();
        var absents = tousTechniciens.Where(e => !présentsIds.Contains(e.Id)).ToList();

        return new PrésentAujourdHuiDto(présents, absents);
    }

    public async Task<PointageMensuelDto> GetPointageMensuelAsync(Guid employeId, int année, int mois)
    {
        var employe = await db.Employes.FindAsync(employeId)
            ?? throw new NotFoundException(nameof(Employe), employeId);

        var debut = new DateOnly(année, mois, 1);
        var fin   = debut.AddMonths(1).AddDays(-1);

        var pointages = await db.Pointages
            .Where(p => p.EmployeId == employeId && p.Date >= debut && p.Date <= fin)
            .OrderBy(p => p.Date)
            .ToListAsync();

        var nomComplet = $"{employe.Prénom} {employe.Nom}";
        return new PointageMensuelDto(
            employeId, nomComplet, $"{année}-{mois:D2}",
            pointages.Select(p => MapPointage(p, nomComplet)).ToList(),
            pointages.Sum(p => p.NbHeuresTravaillées),
            pointages.Sum(p => p.NbHeuresSup),
            pointages.Count(p => p.TypeJour == TypeJour.Travaillé && p.HeureSortie == null),
            pointages.Count(p => p.TypeJour == TypeJour.Congé));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PAIE
    // ═══════════════════════════════════════════════════════════════════════════

    public async Task<BulletinPaieDto> CalculerBulletinAsync(CalculerPaieDto dto)
    {
        if (await db.BulletinsPaie.AnyAsync(b => b.EmployeId == dto.EmployeId && b.Mois == dto.Mois))
            throw new ConflictException($"Un bulletin existe déjà pour {dto.Mois}.");

        var employe = await db.Employes.FindAsync(dto.EmployeId)
            ?? throw new NotFoundException(nameof(Employe), dto.EmployeId);

        if (!DateTime.TryParse(dto.Mois + "-01", out var moisDate))
            throw new BusinessRuleException("Format de mois invalide (attendu : YYYY-MM).");

        var debut = DateOnly.FromDateTime(moisDate);
        var fin   = DateOnly.FromDateTime(moisDate.AddMonths(1).AddDays(-1));

        var pointages = await db.Pointages
            .Where(p => p.EmployeId == dto.EmployeId && p.Date >= debut && p.Date <= fin
                     && p.TypeJour == TypeJour.Travaillé)
            .ToListAsync();

        var primes = await db.Primes
            .Where(p => p.EmployeId == dto.EmployeId && p.Mois == dto.Mois)
            .ToListAsync();

        var joursTravaillés    = pointages.Count;
        var joursOuvrables     = CalculerJoursOuvrables(moisDate.Year, moisDate.Month);
        var totalHeuresSup     = pointages.Sum(p => p.NbHeuresSup);
        var totalPrimes        = primes.Sum(p => p.Montant);

        var salairePropratisé  = joursOuvrables > 0
            ? employe.SalaireBase * joursTravaillés / joursOuvrables
            : employe.SalaireBase;

        var tauxHoraire        = employe.SalaireBase / 173.33m;
        var majHeuresSup       = Math.Round(tauxHoraire * 1.25m * totalHeuresSup, 2);
        var salaireBrut        = salairePropratisé + majHeuresSup + totalPrimes;

        // Cotisations (taux DZ)
        var cnas               = Math.Round(salaireBrut * 0.09m, 2);
        var retraite           = Math.Round(salaireBrut * 0.02m, 2);
        var irg                = CalculerIRG(salaireBrut - cnas - retraite);
        var totalCotisations   = cnas + retraite + irg;
        var salaireNet         = salaireBrut - totalCotisations;

        var bulletin = new BulletinPaie
        {
            EmployeId             = dto.EmployeId,
            Mois                  = dto.Mois,
            JoursTravaillés       = joursTravaillés,
            JoursOuvrablesMois    = joursOuvrables,
            SalaireBase           = employe.SalaireBase,
            SalaireBasePropratisé = Math.Round(salairePropratisé, 2),
            MajHeuresSup          = majHeuresSup,
            TotalPrimes           = totalPrimes,
            SalaireBrut           = Math.Round(salaireBrut, 2),
            CotisationCNAS        = cnas,
            CotisationRetraite    = retraite,
            IRG                   = irg,
            TotalCotisations      = totalCotisations,
            SalaireNet            = Math.Round(salaireNet, 2),
            Statut                = "EnAttente",
        };

        db.BulletinsPaie.Add(bulletin);
        await db.SaveChangesAsync();
        return MapBulletin(bulletin, $"{employe.Prénom} {employe.Nom}");
    }

    public async Task<BulletinPaieDto> MarquerPayéAsync(Guid id, MarquerPayéDto dto)
    {
        var b = await db.BulletinsPaie.Include(b => b.Employe).FirstOrDefaultAsync(b => b.Id == id)
            ?? throw new NotFoundException(nameof(BulletinPaie), id);
        b.Statut       = "Payé";
        b.DatePaiement = dto.DatePaiement;
        b.ModePaiement = dto.ModePaiement;
        await db.SaveChangesAsync();
        return MapBulletin(b, $"{b.Employe.Prénom} {b.Employe.Nom}");
    }

    public async Task<List<BulletinPaieDto>> GetBulletinsAsync(Guid employeId)
    {
        var employe = await db.Employes.FindAsync(employeId)
            ?? throw new NotFoundException(nameof(Employe), employeId);
        var list = await db.BulletinsPaie
            .Where(b => b.EmployeId == employeId)
            .OrderByDescending(b => b.Mois)
            .ToListAsync();
        var nom = $"{employe.Prénom} {employe.Nom}";
        return list.Select(b => MapBulletin(b, nom)).ToList();
    }

    public async Task<PrimeDto> AddPrimeAsync(CreatePrimeDto dto)
    {
        var p = new Prime
        {
            EmployeId   = dto.EmployeId,
            Mois        = dto.Mois,
            Type        = dto.Type,
            Montant     = dto.Montant,
            Description = dto.Description,
        };
        db.Primes.Add(p);
        await db.SaveChangesAsync();
        return new PrimeDto(p.Id, p.EmployeId, p.Mois, p.Type, p.Montant, p.Description);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CONGÉS
    // ═══════════════════════════════════════════════════════════════════════════

    public async Task<CongeResponseDto> SoumettreCongeAsync(Guid employeId, DemandeCongeDto dto)
    {
        var employe = await db.Employes.FindAsync(employeId)
            ?? throw new NotFoundException(nameof(Employe), employeId);

        if (dto.DateDébut <= DateOnly.FromDateTime(DateTime.Now))
            throw new BusinessRuleException("La date de début doit être au moins demain.");

        if (dto.DateFin < dto.DateDébut)
            throw new BusinessRuleException("La date de fin doit être après la date de début.");

        // Vérifier chevauchement
        var chevauche = await db.DemandesConge.AnyAsync(d =>
            d.EmployeId == employeId && d.Statut == CongeStatut.Approuvé
            && d.DateDébut <= dto.DateFin && d.DateFin >= dto.DateDébut);
        if (chevauche)
            throw new ConflictException("Un congé approuvé existe déjà sur cette période.");

        var nbJours = (dto.DateFin.DayNumber - dto.DateDébut.DayNumber) + 1;

        // Vérifier solde si congé annuel
        if (dto.Type == TypeConge.Annuel)
        {
            var solde = await db.SoldesConge
                .FirstOrDefaultAsync(s => s.EmployeId == employeId && s.Année == DateTime.Now.Year);
            if (solde is not null && solde.AnnuelRestant < nbJours)
                throw new BusinessRuleException(
                    $"Solde insuffisant : {solde.AnnuelRestant} jour(s) disponible(s), {nbJours} demandés.");
        }

        var demande = new DemandeConge
        {
            EmployeId = employeId, Type = dto.Type,
            DateDébut = dto.DateDébut, DateFin = dto.DateFin,
            NbJours = nbJours, Motif = dto.Motif,
            Statut = CongeStatut.EnAttente,
        };
        db.DemandesConge.Add(demande);
        await db.SaveChangesAsync();
        return MapConge(demande, $"{employe.Prénom} {employe.Nom}");
    }

    public async Task<List<CongeResponseDto>> GetMesDemandesAsync(Guid employeId)
    {
        var employe = await db.Employes.FindAsync(employeId)
            ?? throw new NotFoundException(nameof(Employe), employeId);
        var list = await db.DemandesConge
            .Where(d => d.EmployeId == employeId)
            .OrderByDescending(d => d.DateCreation).ToListAsync();
        var nom = $"{employe.Prénom} {employe.Nom}";
        return list.Select(d => MapConge(d, nom)).ToList();
    }

    public async Task<List<CongeResponseDto>> GetAApprouverAsync()
    {
        return await db.DemandesConge
            .Include(d => d.Employe)
            .Where(d => d.Statut == CongeStatut.EnAttente)
            .OrderBy(d => d.DateDébut)
            .Select(d => MapConge(d, $"{d.Employe.Prénom} {d.Employe.Nom}"))
            .ToListAsync();
    }

    public async Task<CongeResponseDto> ApprouverAsync(Guid id, Guid approbateurId, string? commentaire)
    {
        var d = await db.DemandesConge.Include(d => d.Employe)
            .FirstOrDefaultAsync(d => d.Id == id)
            ?? throw new NotFoundException(nameof(DemandeConge), id);

        if (d.Statut != CongeStatut.EnAttente)
            throw new BusinessRuleException("Cette demande n'est plus en attente.");

        d.Statut               = CongeStatut.Approuvé;
        d.ApprobateurId        = approbateurId;
        d.DateDecision         = DateTime.UtcNow;
        d.CommentaireDecision  = commentaire;

        // Créer les pointages Congé pour chaque jour
        for (var date = d.DateDébut; date <= d.DateFin; date = date.AddDays(1))
        {
            if (date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday) continue;
            db.Pointages.Add(new Pointage
            {
                EmployeId = d.EmployeId, Date = date,
                TypeJour  = TypeJour.Congé,
                HeureEntrée = new TimeOnly(8, 0),
            });
        }

        // Déduire du solde si congé annuel
        if (d.Type == TypeConge.Annuel)
        {
            var solde = await db.SoldesConge
                .FirstOrDefaultAsync(s => s.EmployeId == d.EmployeId && s.Année == DateTime.Now.Year);
            if (solde is not null) solde.AnnuelPris += d.NbJours;
        }

        await db.SaveChangesAsync();
        return MapConge(d, $"{d.Employe.Prénom} {d.Employe.Nom}");
    }

    public async Task<CongeResponseDto> RefuserAsync(Guid id, Guid approbateurId, string motif)
    {
        var d = await db.DemandesConge.Include(d => d.Employe)
            .FirstOrDefaultAsync(d => d.Id == id)
            ?? throw new NotFoundException(nameof(DemandeConge), id);

        if (d.Statut != CongeStatut.EnAttente)
            throw new BusinessRuleException("Cette demande n'est plus en attente.");

        d.Statut              = CongeStatut.Refusé;
        d.ApprobateurId       = approbateurId;
        d.DateDecision        = DateTime.UtcNow;
        d.CommentaireDecision = motif;
        await db.SaveChangesAsync();
        return MapConge(d, $"{d.Employe.Prénom} {d.Employe.Nom}");
    }

    public async Task<SoldeCongeDto> GetSoldeCongeAsync(Guid employeId)
    {
        var solde = await db.SoldesConge
            .FirstOrDefaultAsync(s => s.EmployeId == employeId && s.Année == DateTime.Now.Year);
        if (solde is null)
        {
            solde = new SoldeConge { EmployeId = employeId, Année = DateTime.Now.Year };
            db.SoldesConge.Add(solde);
            await db.SaveChangesAsync();
        }
        return new SoldeCongeDto(solde.EmployeId, solde.Année, solde.AnnuelTotal, solde.AnnuelPris, solde.AnnuelRestant);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    private static int CalculerJoursOuvrables(int année, int mois)
    {
        var debut = new DateTime(année, mois, 1);
        var fin   = debut.AddMonths(1);
        int count = 0;
        for (var d = debut; d < fin; d = d.AddDays(1))
            if (d.DayOfWeek is not DayOfWeek.Friday and not DayOfWeek.Saturday)
                count++;
        return count;
    }

    private static decimal CalculerIRG(decimal salaire)
    {
        // Tranches IRG simplifiées (DZD/mois)
        return salaire switch
        {
            <= 30000  => 0,
            <= 120000 => Math.Round((salaire - 30000) * 0.20m, 2),
            <= 360000 => Math.Round(18000 + (salaire - 120000) * 0.30m, 2),
            _         => Math.Round(90000 + (salaire - 360000) * 0.35m, 2),
        };
    }

    private static EmployeResponseDto MapEmploye(Employe e, bool canSeeSalary) => new(
        e.Id, e.Nom, e.Prénom, $"{e.Prénom} {e.Nom}",
        e.Téléphone, e.Email, e.Adresse,
        e.Poste, e.Département,
        canSeeSalary ? e.SalaireBase : null,
        e.TypeContrat, e.DateEmbauche, e.DateFinContrat,
        e.IsActif, e.OrdresAssignés.Count);

    private static PointageResponseDto MapPointage(Pointage p, string nom) => new(
        p.Id, p.EmployeId, nom, p.Date, p.HeureEntrée, p.HeureSortie,
        p.TypeJour, p.NbHeuresTravaillées, p.NbHeuresSup, p.Notes);

    private static BulletinPaieDto MapBulletin(BulletinPaie b, string nom) => new(
        b.Id, b.EmployeId, nom, b.Mois, b.JoursTravaillés, b.JoursOuvrablesMois,
        b.SalaireBase, b.SalaireBasePropratisé, b.MajHeuresSup, b.TotalPrimes,
        b.SalaireBrut, b.CotisationCNAS, b.CotisationRetraite, b.IRG,
        b.TotalCotisations, b.SalaireNet, b.Statut, b.DatePaiement, b.ModePaiement);

    private static CongeResponseDto MapConge(DemandeConge d, string nom) => new(
        d.Id, d.EmployeId, nom, d.Type, d.DateDébut, d.DateFin,
        d.NbJours, d.Motif, d.Statut, d.DateDecision, d.CommentaireDecision);
}

public record PrimeDto(Guid Id, Guid EmployeId, string Mois, string Type, decimal Montant, string? Description);
