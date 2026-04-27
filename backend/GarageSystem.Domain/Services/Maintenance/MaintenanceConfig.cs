namespace GarageSystem.Domain.Services.Maintenance;

public sealed class MaintenanceConfig
{
    // Vidange huile
    public int VidangeKm    { get; set; } = 5000;
    public int VidangeJours { get; set; } = 180;

    // Kit distribution
    public int DistributionKm    { get; set; } = 60000;
    public int DistributionJours { get; set; } = 1460; // 4 ans

    // Plaquettes freins
    public int PlaquettesKm { get; set; } = 25000;

    // Boîte de vitesses
    public int BoiteKm    { get; set; } = 80000;
    public int BoiteJours { get; set; } = 1460; // 4 ans

    // Filtre habitacle
    public int FiltreHabitacleJours { get; set; } = 365;

    // Révision générale
    public int RévisionKm    { get; set; } = 15000;
    public int RévisionJours { get; set; } = 365;
}
