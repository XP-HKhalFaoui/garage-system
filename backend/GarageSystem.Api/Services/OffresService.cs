using GarageSystem.Api.DTOs.CRM;
using GarageSystem.Domain.Entities;
using GarageSystem.Domain.Exceptions;
using GarageSystem.Domain.Services.Maintenance;
using GarageSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GarageSystem.Api.Services;

public class OffresService(
    ApplicationDbContext db,
    MoteurOffresService moteur,
    ILogger<OffresService> logger)
{
    // ── Véhicules avec offres dues ────────────────────────────────────────────
    public async Task<List<VehiculeAvecOffresDto>> GetVehiculesAvecOffresAsync(int page, int pageSize)
    {
        var vehicules = await db.Vehicules
            .Include(v => v.Client)
            .Include(v => v.OrdresReparation)
            .Where(v => v.IsActif)
            .ToListAsync();

        var résultats = new List<VehiculeAvecOffresDto>();

        foreach (var v in vehicules)
        {
            var offres = moteur.CalculerOffres(v, v.OrdresReparation.ToList());
            if (!offres.Any()) continue;

            var dernierEnvoi = await db.OffresEnvoyees
                .Where(o => o.VehiculeId == v.Id)
                .MaxAsync(o => (DateTime?)o.DateEnvoi);

            résultats.Add(new VehiculeAvecOffresDto(
                v.Id, v.Immatriculation, v.Marque, v.Modele,
                new ClientOffreDto(v.Client.Id, v.Client.Nom, v.Client.Téléphone, v.Client.Email),
                offres.Select(o => new OffreEntretienDto(
                    o.Type, o.Urgence.ToString(), o.KmRestants, o.JoursRestants, o.MessageSuggéré)).ToList(),
                dernierEnvoi));
        }

        return résultats
            .OrderByDescending(r => r.Offres.Any(o => o.Urgence == "Immédiat"))
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();
    }

    // ── Envoi d'offres ────────────────────────────────────────────────────────
    public async Task<EnvoyerOffresResultDto> EnvoyerAsync(EnvoyerOffresDto dto, string userId)
    {
        var envoyées = 0;
        var echecs = new List<EchecEnvoiDto>();

        foreach (var vehiculeId in dto.VehiculeIds)
        {
            try
            {
                var vehicule = await db.Vehicules
                    .Include(v => v.Client)
                    .Include(v => v.OrdresReparation)
                    .FirstOrDefaultAsync(v => v.Id == vehiculeId);

                if (vehicule is null)
                {
                    echecs.Add(new EchecEnvoiDto(vehiculeId, "Véhicule introuvable."));
                    continue;
                }

                var offres = moteur.CalculerOffres(vehicule, vehicule.OrdresReparation.ToList());
                if (!offres.Any())
                {
                    echecs.Add(new EchecEnvoiDto(vehiculeId, "Aucune offre d'entretien due pour ce véhicule."));
                    continue;
                }

                var types = offres.Select(o => o.Type).ToList();
                var message = BuildMessage(vehicule, offres, dto.Canal);

                // Simulation envoi (TODO: intégrer Twilio/MailKit en prod)
                logger.LogInformation(
                    "Envoi offre {Canal} → {Immat} (client {Client}) : {Types}",
                    dto.Canal, vehicule.Immatriculation,
                    vehicule.Client.Téléphone, string.Join(", ", types));

                var offre = new OffreEnvoyee
                {
                    VehiculeId    = vehiculeId,
                    Types         = System.Text.Json.JsonSerializer.Serialize(types),
                    Canal         = dto.Canal,
                    DateEnvoi     = DateTime.UtcNow,
                    Statut        = "Envoyée",
                    MessageEnvoyé = message,
                    UserId        = userId,
                };

                db.OffresEnvoyees.Add(offre);
                envoyées++;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Erreur envoi offre vehicule {Id}", vehiculeId);
                echecs.Add(new EchecEnvoiDto(vehiculeId, ex.Message));
            }
        }

        await db.SaveChangesAsync();

        return new EnvoyerOffresResultDto(dto.VehiculeIds.Count, envoyées, echecs);
    }

    public async Task ChangerStatutAsync(Guid id, string statut)
    {
        var offre = await db.OffresEnvoyees.FindAsync(id)
            ?? throw new NotFoundException(nameof(OffreEnvoyee), id);

        var validStatuts = new[] { "Acceptée", "Refusée", "SansRéponse" };
        if (!validStatuts.Contains(statut))
            throw new BusinessRuleException($"Statut invalide : {statut}");

        offre.Statut = statut;
        await db.SaveChangesAsync();
    }

    public async Task<List<OffreEnvoyeeHistDto>> GetOffresVehiculeAsync(Guid vehiculeId)
    {
        var rows = await db.OffresEnvoyees
            .Where(o => o.VehiculeId == vehiculeId)
            .OrderByDescending(o => o.DateEnvoi)
            .Select(o => new { o.Id, o.Types, o.Canal, o.DateEnvoi, o.Statut })
            .ToListAsync();

        return rows.Select(o => new OffreEnvoyeeHistDto(
            o.Id,
            System.Text.Json.JsonSerializer.Deserialize<List<string>>(o.Types) ?? new(),
            o.Canal,
            o.DateEnvoi,
            o.Statut)).ToList();
    }

    // ── Scan (appelé par Hangfire) ────────────────────────────────────────────
    public async Task ScannerVehiculesAsync()
    {
        var cutoff = DateTime.UtcNow.AddYears(-2);

        var vehicules = await db.Vehicules
            .Include(v => v.Client)
            .Include(v => v.OrdresReparation)
            .Where(v => v.IsActif)
            .ToListAsync();

        var notifCount = 0;

        foreach (var vehicule in vehicules)
        {
            var offres = moteur.CalculerOffres(vehicule, vehicule.OrdresReparation.ToList());
            var urgent = offres.Any(o => o.Urgence is NiveauUrgence.Immédiat or NiveauUrgence.Bientôt);
            if (!urgent) continue;

            var dernierEnvoi = await db.OffresEnvoyees
                .Where(o => o.VehiculeId == vehicule.Id)
                .MaxAsync(o => (DateTime?)o.DateEnvoi);

            if (dernierEnvoi.HasValue && (DateTime.UtcNow - dernierEnvoi.Value).TotalDays < 30)
                continue;

            db.Notifications.Add(new Notification
            {
                Type      = "OffresDisponibles",
                Message   = $"Entretien à planifier : {vehicule.Immatriculation} ({vehicule.Client.Nom})",
                Level     = "Warning",
                ActionUrl = $"/vehicules/{vehicule.Id}",
            });
            notifCount++;
        }

        if (notifCount > 0)
            await db.SaveChangesAsync();

        logger.LogInformation("Scan offres terminé : {Total} véhicules, {Notif} notifications créées.",
            vehicules.Count, notifCount);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private static string BuildMessage(Vehicule v, List<OffreEntretienResult> offres, string canal)
    {
        var types = string.Join(", ", offres.Select(o => o.Type));
        return canal is "Email"
            ? $"Bonjour {v.Client.Nom},\n\nVotre véhicule {v.Immatriculation} ({v.Marque} {v.Modele}) " +
              $"nécessite les entretiens suivants :\n\n{types}\n\nContactez-nous pour planifier votre passage."
            : $"Bonjour {v.Client.Nom}, votre {v.Marque} {v.Immatriculation} nécessite : {types}. " +
              $"Appelez-nous pour un rendez-vous.";
    }
}
