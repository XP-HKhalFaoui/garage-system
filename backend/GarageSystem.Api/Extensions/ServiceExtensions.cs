using GarageSystem.Api.Jobs;
using GarageSystem.Api.Services;
using GarageSystem.Domain.Services.Maintenance;
using Hangfire;
using Microsoft.Extensions.Options;

namespace GarageSystem.Api.Extensions;

public static class ServiceExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        // Services métier
        services.AddScoped<OrdreReparationService>();
        services.AddScoped<StockService>();
        services.AddScoped<VehiculeService>();
        services.AddScoped<OffresService>();
        services.AddScoped<BillingService>();
        services.AddScoped<PdfService>();
        services.AddScoped<RHService>();
        services.AddScoped<StatsService>();
        services.AddScoped<FleetService>();

        services.AddTransient<StockAlertJob>();
        services.AddTransient<OffresScanJob>();

        // Moteur de règles d'entretien
        services.AddSingleton<MoteurOffresService>();

        // Cache mémoire
        services.AddMemoryCache();

        return services;
    }

    public static void ConfigureHangfireJobs()
    {
        // Vérification stock bas — toutes les heures
        RecurringJob.AddOrUpdate<StockAlertJob>(
            "check-stock-min",
            j => j.ExecuteAsync(),
            "0 * * * *");

        // Scan offres entretien — tous les jours à 8h00
        RecurringJob.AddOrUpdate<OffresScanJob>(
            "scan-offres-vehicules",
            j => j.ExecuteAsync(),
            "0 8 * * *");
    }
}
