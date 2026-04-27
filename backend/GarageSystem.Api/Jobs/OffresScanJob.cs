using GarageSystem.Api.Services;

namespace GarageSystem.Api.Jobs;

public class OffresScanJob(OffresService offresService, ILogger<OffresScanJob> logger)
{
    public async Task ExecuteAsync()
    {
        logger.LogInformation("Démarrage scan offres véhicules — {Time}", DateTime.UtcNow);
        await offresService.ScannerVehiculesAsync();
    }
}
