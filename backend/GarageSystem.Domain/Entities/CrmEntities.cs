using GarageSystem.Domain.Common;

namespace GarageSystem.Domain.Entities;

public class OffreEnvoyee : BaseEntity
{
    public Guid VehiculeId { get; set; }
    public Vehicule Vehicule { get; set; } = null!;
    public string Types { get; set; } = string.Empty;   // JSON array : ["Vidange","Distribution"]
    public string Canal { get; set; } = string.Empty;   // "SMS" | "Email" | "LesDeux"
    public DateTime DateEnvoi { get; set; } = DateTime.UtcNow;
    public string Statut { get; set; } = "Envoyée";     // Envoyée | Acceptée | Refusée | SansRéponse
    public string? MessageEnvoyé { get; set; }
    public string? UserId { get; set; }
}

public class Notification : BaseEntity
{
    public string Type { get; set; } = string.Empty;    // StockBas | OffresDisponibles | MaintenanceMatériel
    public string Message { get; set; } = string.Empty;
    public string Level { get; set; } = "Info";         // Info | Warning | Error
    public bool IsRead { get; set; }
    public string? UserId { get; set; }                 // null = broadcast
    public string? ActionUrl { get; set; }
}
