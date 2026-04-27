using GarageSystem.Api.DTOs.CRM;
using GarageSystem.Domain.Entities;
using GarageSystem.Domain.Enums;
using GarageSystem.Domain.Exceptions;
using GarageSystem.Domain.Services.Maintenance;
using GarageSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GarageSystem.Api.Services;

public class VehiculeService(ApplicationDbContext db, MoteurOffresService moteur)
{
    // ── Historique complet ─────────────────────────────────────────────────────
    public async Task<VehiculeHistoriqueDto> GetHistoriqueAsync(Guid id)
    {
        var vehicule = await db.Vehicules
            .Include(v => v.Client)
            .FirstOrDefaultAsync(v => v.Id == id)
            ?? throw new NotFoundException(nameof(Vehicule), id);

        var ors = await db.OrdresReparation
            .Where(o => o.VehiculeId == id)
            .Include(o => o.Technicien)
            .Include(o => o.Lignes).ThenInclude(l => l.Article)
            .OrderByDescending(o => o.DateOuverture)
            .ToListAsync();

        var offresEnvoyees = await db.OffresEnvoyees
            .Where(o => o.VehiculeId == id)
            .OrderByDescending(o => o.DateEnvoi)
            .ToListAsync();

        var stats = new VehiculeStatistiquesDto(
            NbInterventions: ors.Count(o => o.Statut is ORStatut.Livré or ORStatut.TerminéTechnicien),
            MontantTotalHT: ors.Where(o => o.Statut is ORStatut.Livré or ORStatut.TerminéTechnicien)
                               .Sum(o => o.MontantTotal),
            PremièreVisite: ors.MinBy(o => o.DateOuverture)?.DateOuverture,
            DernièreVisite: vehicule.DateDernièreVisite,
            KmParcourus: vehicule.KilométrageActuel - vehicule.KilométrageDernièreVisite);

        var interventions = ors.Select(o => new InterventionHistoriqueDto(
            OrId: o.Id,
            Numéro: o.Numéro,
            Date: o.DateOuverture,
            KmAuMoment: null,
            TypeIntervention: o.TypeIntervention.ToString(),
            TechnicienNom: o.Technicien is null ? null : $"{o.Technicien.Prénom} {o.Technicien.Nom}",
            Statut: o.Statut.ToString(),
            MontantHT: o.MontantTotal,
            Pièces: o.Lignes
                .Where(l => l.Type == LigneORType.Pièce)
                .Select(l => new PièceHistoriqueDto(
                    l.Article?.Référence,
                    l.Description,
                    l.Quantité,
                    l.PrixUnitaire,
                    l.TotalHT))
                .ToList(),
            MainOeuvre: o.Lignes
                .Where(l => l.Type == LigneORType.MO)
                .Select(l => new MOHistoriqueDto(
                    l.Description,
                    l.Quantité,
                    l.PrixUnitaire,
                    l.TotalHT))
                .ToList()
        )).ToList();

        var offresHist = offresEnvoyees.Select(o => new OffreEnvoyeeHistDto(
            o.Id,
            System.Text.Json.JsonSerializer.Deserialize<List<string>>(o.Types) ?? [],
            o.Canal,
            o.DateEnvoi,
            o.Statut)).ToList();

        return new VehiculeHistoriqueDto(
            MapVehiculeDetail(vehicule),
            MapClientDetail(vehicule.Client),
            stats,
            interventions,
            offresHist);
    }

    // ── CRUD véhicules ────────────────────────────────────────────────────────
    public async Task<(List<VehiculeResponseDto> Items, int Total)> GetListAsync(
        string? search, string? marque, string? carburant, Guid? clientId,
        bool? avecEntretienDu, int page, int pageSize)
    {
        var q = db.Vehicules
            .Include(v => v.Client)
            .Include(v => v.OrdresReparation)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(v => v.Immatriculation.Contains(search)
                           || v.Marque.Contains(search)
                           || v.Modele.Contains(search));

        if (!string.IsNullOrWhiteSpace(marque))
            q = q.Where(v => v.Marque == marque);

        if (!string.IsNullOrWhiteSpace(carburant) && Enum.TryParse<Carburant>(carburant, out var c))
            q = q.Where(v => v.Carburant == c);

        if (clientId.HasValue)
            q = q.Where(v => v.ClientId == clientId.Value);

        var total = await q.CountAsync();
        var vehicules = await q
            .OrderByDescending(v => v.DateDernièreVisite)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var items = new List<VehiculeResponseDto>();
        foreach (var v in vehicules)
        {
            List<OffreEntretienDto>? offres = null;
            if (avecEntretienDu == true)
            {
                var ors = v.OrdresReparation.ToList();
                var résultats = moteur.CalculerOffres(v, ors);
                if (!résultats.Any()) continue;
                offres = résultats.Select(MapOffre).ToList();
            }

            items.Add(MapResponse(v, offres));
        }

        return (items, total);
    }

    public async Task<VehiculeResponseDto> GetByIdAsync(Guid id)
    {
        var v = await db.Vehicules
            .Include(v => v.Client)
            .Include(v => v.OrdresReparation)
            .FirstOrDefaultAsync(v => v.Id == id)
            ?? throw new NotFoundException(nameof(Vehicule), id);

        var offres = moteur.CalculerOffres(v, v.OrdresReparation.ToList()).Select(MapOffre).ToList();
        return MapResponse(v, offres);
    }

    public async Task<VehiculeResponseDto> CreateAsync(CreateVehiculeDto dto)
    {
        if (!await db.Clients.AnyAsync(c => c.Id == dto.ClientId))
            throw new NotFoundException(nameof(Client), dto.ClientId);

        if (await db.Vehicules.AnyAsync(v => v.Immatriculation == dto.Immatriculation))
            throw new ConflictException($"Immatriculation '{dto.Immatriculation}' déjà enregistrée.");

        if (!Enum.TryParse<Carburant>(dto.Carburant, out var carb))
            throw new BusinessRuleException($"Carburant invalide : {dto.Carburant}");
        if (!Enum.TryParse<Transmission>(dto.Transmission, out var trans))
            throw new BusinessRuleException($"Transmission invalide : {dto.Transmission}");

        var vehicule = new Vehicule
        {
            ClientId              = dto.ClientId,
            Immatriculation       = dto.Immatriculation.ToUpper(),
            VIN                   = dto.Vin,
            Marque                = dto.Marque,
            Modele                = dto.Modele,
            Version               = dto.Version,
            Année                 = dto.Annee,
            Carburant             = carb,
            Transmission          = trans,
            Cylindrée             = dto.Cylindrée,
            Couleur               = dto.Couleur,
            KilométrageActuel     = dto.KilométrageActuel,
            IsActif               = true,
        };

        db.Vehicules.Add(vehicule);
        await db.SaveChangesAsync();
        return await GetByIdAsync(vehicule.Id);
    }

    public async Task<VehiculeResponseDto> UpdateAsync(Guid id, UpdateVehiculeDto dto)
    {
        var v = await db.Vehicules.FindAsync(id)
            ?? throw new NotFoundException(nameof(Vehicule), id);

        if (!Enum.TryParse<Carburant>(dto.Carburant, out var carb))
            throw new BusinessRuleException($"Carburant invalide : {dto.Carburant}");
        if (!Enum.TryParse<Transmission>(dto.Transmission, out var trans))
            throw new BusinessRuleException($"Transmission invalide : {dto.Transmission}");

        v.VIN          = dto.Vin;
        v.Marque       = dto.Marque;
        v.Modele       = dto.Modele;
        v.Version      = dto.Version;
        v.Année        = dto.Annee;
        v.Carburant    = carb;
        v.Transmission = trans;
        v.Cylindrée    = dto.Cylindrée;
        v.Couleur      = dto.Couleur;

        await db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task MajKilométrageAsync(Guid id, decimal km)
    {
        var v = await db.Vehicules.FindAsync(id)
            ?? throw new NotFoundException(nameof(Vehicule), id);

        if (km < v.KilométrageActuel)
            throw new BusinessRuleException($"Le kilométrage ne peut pas être inférieur au kilométrage actuel ({v.KilométrageActuel} km).");

        v.KilométrageActuel = km;
        await db.SaveChangesAsync();
    }

    public async Task<List<VehiculeSearchResultDto>> SearchAsync(string q)
    {
        return await db.Vehicules
            .Include(v => v.Client)
            .Where(v => v.Immatriculation.Contains(q)
                     || v.Marque.Contains(q)
                     || v.Modele.Contains(q))
            .Take(10)
            .Select(v => new VehiculeSearchResultDto(
                v.Id,
                v.Immatriculation,
                v.Marque,
                v.Modele,
                v.Année,
                v.Client.Nom + (v.Client.Prénom != null ? " " + v.Client.Prénom : ""),
                v.Client.Téléphone))
            .ToListAsync();
    }

    public async Task<List<OffreEntretienDto>> GetProchainEntretienAsync(Guid id)
    {
        var v = await db.Vehicules
            .Include(v => v.OrdresReparation)
            .FirstOrDefaultAsync(v => v.Id == id)
            ?? throw new NotFoundException(nameof(Vehicule), id);

        return moteur.CalculerOffres(v, v.OrdresReparation.ToList()).Select(MapOffre).ToList();
    }

    // ── Clients ────────────────────────────────────────────────────────────────
    public async Task<(List<ClientResponseDto> Items, int Total)> GetClientsAsync(
        string? search, string? type, string? wilaya, int page, int pageSize)
    {
        var q = db.Clients
            .Include(c => c.Vehicules).ThenInclude(v => v.OrdresReparation)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(c => c.Nom.Contains(search)
                           || (c.Prénom != null && c.Prénom.Contains(search))
                           || (c.RaisonSociale != null && c.RaisonSociale.Contains(search))
                           || c.Téléphone.Contains(search)
                           || c.Vehicules.Any(v => v.Immatriculation.Contains(search)));

        if (!string.IsNullOrWhiteSpace(type) && Enum.TryParse<ClientType>(type, out var ct))
            q = q.Where(c => c.Type == ct);

        if (!string.IsNullOrWhiteSpace(wilaya))
            q = q.Where(c => c.Wilaya.ToString() == wilaya);

        var total = await q.CountAsync();
        var clients = await q
            .OrderByDescending(c => c.DateCreation)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (clients.Select(MapClientResponse).ToList(), total);
    }

    public async Task<ClientResponseDto> GetClientByIdAsync(Guid id)
    {
        var c = await db.Clients
            .Include(c => c.Vehicules).ThenInclude(v => v.OrdresReparation)
            .FirstOrDefaultAsync(c => c.Id == id)
            ?? throw new NotFoundException(nameof(Client), id);

        return MapClientResponse(c);
    }

    public async Task<ClientResponseDto> CreateClientAsync(CreateClientDto dto)
    {
        if (await db.Clients.AnyAsync(c => c.Téléphone == dto.Téléphone))
            throw new ConflictException($"Un client avec le téléphone '{dto.Téléphone}' existe déjà.");

        if (!Enum.TryParse<ClientType>(dto.Type, out var type))
            throw new BusinessRuleException($"Type client invalide : {dto.Type}");

        var client = new Client
        {
            Type          = type,
            Nom           = dto.Nom,
            Prénom        = dto.Prénom,
            RaisonSociale = dto.RaisonSociale,
            Téléphone     = dto.Téléphone,
            TéléphoneAlt  = dto.TéléphoneAlt,
            Email         = dto.Email,
            Adresse       = dto.Adresse,
            DateNaissance = dto.DateNaissance,
            NRC           = dto.Nrc,
            NIF           = dto.Nif,
            IsActif       = true,
        };

        if (!Enum.TryParse<Wilaya>(dto.Wilaya, out var wilaya))
            throw new BusinessRuleException($"Wilaya invalide : {dto.Wilaya}");
        client.Wilaya = wilaya;

        db.Clients.Add(client);
        await db.SaveChangesAsync();
        return await GetClientByIdAsync(client.Id);
    }

    public async Task<ClientResponseDto> UpdateClientAsync(Guid id, UpdateClientDto dto)
    {
        var c = await db.Clients.FindAsync(id)
            ?? throw new NotFoundException(nameof(Client), id);

        if (!Enum.TryParse<Wilaya>(dto.Wilaya, out var wilaya))
            throw new BusinessRuleException($"Wilaya invalide : {dto.Wilaya}");

        c.Nom           = dto.Nom;
        c.Prénom        = dto.Prénom;
        c.RaisonSociale = dto.RaisonSociale;
        c.TéléphoneAlt  = dto.TéléphoneAlt;
        c.Email         = dto.Email;
        c.Adresse       = dto.Adresse;
        c.Wilaya        = wilaya;
        c.DateNaissance = dto.DateNaissance;
        c.NRC           = dto.Nrc;
        c.NIF           = dto.Nif;

        await db.SaveChangesAsync();
        return await GetClientByIdAsync(id);
    }

    public async Task DeleteClientAsync(Guid id)
    {
        var c = await db.Clients
            .Include(c => c.Vehicules).ThenInclude(v => v.OrdresReparation)
            .FirstOrDefaultAsync(c => c.Id == id)
            ?? throw new NotFoundException(nameof(Client), id);

        var hasActiveOR = c.Vehicules.Any(v =>
            v.OrdresReparation.Any(o =>
                o.Statut is ORStatut.EnAttente or ORStatut.EnCours or ORStatut.Suspendu));

        if (hasActiveOR)
            throw new BusinessRuleException("Impossible de supprimer un client avec des OR actifs.");

        c.IsDeleted = true;
        c.DateSuppression = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }

    public async Task<List<ClientSearchResultDto>> SearchClientsAsync(string q)
    {
        return await db.Clients
            .Where(c => c.Nom.Contains(q)
                     || (c.Prénom != null && c.Prénom.Contains(q))
                     || (c.RaisonSociale != null && c.RaisonSociale.Contains(q))
                     || c.Téléphone.Contains(q))
            .Take(10)
            .Select(c => new ClientSearchResultDto(
                c.Id,
                c.Type == ClientType.Société
                    ? c.RaisonSociale ?? c.Nom
                    : c.Nom + (c.Prénom != null ? " " + c.Prénom : ""),
                c.Téléphone,
                c.Vehicules.Count(v => !v.IsDeleted)))
            .ToListAsync();
    }

    public async Task<List<VehiculeResponseDto>> GetVehiculesByClientAsync(Guid clientId)
    {
        if (!await db.Clients.AnyAsync(c => c.Id == clientId))
            throw new NotFoundException(nameof(Client), clientId);

        var vehicules = await db.Vehicules
            .Include(v => v.Client)
            .Include(v => v.OrdresReparation)
            .Where(v => v.ClientId == clientId)
            .ToListAsync();

        return vehicules.Select(v => MapResponse(v, null)).ToList();
    }

    // ── Mapping helpers ────────────────────────────────────────────────────────
    private static VehiculeDetailDto MapVehiculeDetail(Vehicule v) => new(
        v.Id, v.Immatriculation, v.VIN, v.Marque, v.Modele, v.Version,
        v.Année, v.Carburant.ToString(), v.Transmission.ToString(),
        v.KilométrageActuel, v.IsActif);

    private static ClientDetailDto MapClientDetail(Client c) => new(
        c.Id, c.Nom, c.Prénom, c.RaisonSociale, c.Téléphone, c.Email, c.Wilaya.ToString());

    private static VehiculeResponseDto MapResponse(Vehicule v, List<OffreEntretienDto>? offres) => new(
        v.Id, v.ClientId,
        v.Client.Type == ClientType.Société
            ? v.Client.RaisonSociale ?? v.Client.Nom
            : $"{v.Client.Nom} {v.Client.Prénom}".Trim(),
        v.Immatriculation, v.VIN, v.Marque, v.Modele, v.Version,
        v.Année, v.Carburant.ToString(), v.Transmission.ToString(),
        v.KilométrageActuel, v.DateDernièreVisite, v.IsActif,
        v.OrdresReparation.Count, offres);

    private static ClientResponseDto MapClientResponse(Client c)
    {
        var allOrs = c.Vehicules.SelectMany(v => v.OrdresReparation).ToList();
        return new ClientResponseDto(
            c.Id, c.Type.ToString(), c.Nom, c.Prénom, c.RaisonSociale,
            c.Téléphone, c.TéléphoneAlt, c.Email, c.Adresse, c.Wilaya.ToString(),
            c.IsActif, c.DateCreation,
            c.Vehicules.Count(v => !v.IsDeleted),
            allOrs.Count,
            allOrs.Sum(o => o.MontantTotal),
            allOrs.MaxBy(o => o.DateOuverture)?.DateOuverture);
    }

    private static OffreEntretienDto MapOffre(OffreEntretienResult r) => new(
        r.Type, r.Urgence.ToString(), r.KmRestants, r.JoursRestants, r.MessageSuggéré);
}
