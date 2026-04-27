using GarageSystem.Domain.Entities;
using Microsoft.Extensions.Options;

namespace GarageSystem.Domain.Services.Maintenance;

public sealed class MoteurOffresService
{
    private readonly List<IRegleEntretien> _règles;

    public MoteurOffresService(IOptions<MaintenanceConfig> options)
    {
        var cfg = options.Value;
        _règles =
        [
            new RegleVidangeHuile(cfg),
            new RegleKitDistribution(cfg),
            new ReglePlaquettesFrein(cfg),
            new RegleVidangeBoite(cfg),
            new RegleFiltreHabitacle(cfg),
            new RegleRevisionGenerale(cfg),
        ];
    }

    public List<OffreEntretienResult> CalculerOffres(Vehicule vehicule, List<OrdreReparation> historique)
    {
        return _règles
            .Select(r => r.CalculerUrgence(vehicule, historique))
            .Where(r => r is not null)
            .Cast<OffreEntretienResult>()
            .OrderBy(r => r.Urgence)
            .ToList();
    }
}
