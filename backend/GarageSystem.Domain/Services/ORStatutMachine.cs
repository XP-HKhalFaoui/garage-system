using GarageSystem.Domain.Enums;
using GarageSystem.Domain.Exceptions;

namespace GarageSystem.Domain.Services;

public static class ORStatutMachine
{
    private static readonly Dictionary<ORStatut, HashSet<ORStatut>> _transitions = new()
    {
        [ORStatut.EnAttente]           = [ORStatut.EnCours, ORStatut.Annulé],
        [ORStatut.EnCours]             = [ORStatut.Suspendu, ORStatut.TerminéTechnicien],
        [ORStatut.Suspendu]            = [ORStatut.EnCours, ORStatut.Annulé],
        [ORStatut.TerminéTechnicien]   = [ORStatut.Livré],
        [ORStatut.Livré]               = [],
        [ORStatut.Annulé]              = [],
    };

    public static bool CanTransition(ORStatut from, ORStatut to)
        => _transitions.TryGetValue(from, out var allowed) && allowed.Contains(to);

    public static void ValidateTransition(ORStatut from, ORStatut to)
    {
        if (!CanTransition(from, to))
            throw new BusinessRuleException(
                $"Transition de '{from}' vers '{to}' non autorisée.");
    }
}
