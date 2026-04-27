using GarageSystem.Domain.Entities;

namespace GarageSystem.Domain.Services.Maintenance;

public enum NiveauUrgence { Immédiat, Bientôt, Préventif }

public interface IRegleEntretien
{
    string Nom { get; }
    OffreEntretienResult? CalculerUrgence(Vehicule vehicule, List<OrdreReparation> historique);
}

public record OffreEntretienResult(
    string Type,
    NiveauUrgence Urgence,
    int? KmRestants,
    int? JoursRestants,
    string MessageSuggéré);
