using GarageSystem.Domain.Entities;
using GarageSystem.Domain.Enums;

namespace GarageSystem.Domain.Services.Maintenance;

// ── Vidange huile ────────────────────────────────────────────────────────────
public sealed class RegleVidangeHuile(MaintenanceConfig cfg) : IRegleEntretien
{
    public string Nom => "Vidange huile";

    public OffreEntretienResult? CalculerUrgence(Vehicule v, List<OrdreReparation> h)
    {
        var dernière = h
            .Where(o => o.TypeIntervention == TypeIntervention.Vidange
                     && o.Statut is ORStatut.Livré or ORStatut.TerminéTechnicien)
            .OrderByDescending(o => o.DateOuverture)
            .FirstOrDefault();

        var kmSeuil     = cfg.VidangeKm;
        var joursSeuil  = cfg.VidangeJours;
        var kmActuel    = (int)v.KilométrageActuel;
        var today       = DateTime.UtcNow;

        int kmRestants;
        int joursRestants;

        if (dernière is null)
        {
            kmRestants    = 0;
            joursRestants = 0;
        }
        else
        {
            var kmDernière    = (int)(dernière.Vehicule?.KilométrageActuel ?? 0);
            var kmParcourus   = kmActuel - kmDernière;
            kmRestants        = kmSeuil - kmParcourus;
            joursRestants     = joursSeuil - (int)(today - dernière.DateOuverture).TotalDays;
        }

        if (kmRestants > 1000 && joursRestants > 30)  return null;

        var urgence = (kmRestants <= 0 || joursRestants <= 0) ? NiveauUrgence.Immédiat
                    : (kmRestants <= 500 || joursRestants <= 14) ? NiveauUrgence.Bientôt
                    : NiveauUrgence.Préventif;

        return new OffreEntretienResult("Vidange huile", urgence,
            Math.Max(0, kmRestants), Math.Max(0, joursRestants),
            $"Vidange huile recommandée — {Math.Max(0, kmRestants)} km restants ou {Math.Max(0, joursRestants)} jours.");
    }
}

// ── Kit distribution ─────────────────────────────────────────────────────────
public sealed class RegleKitDistribution(MaintenanceConfig cfg) : IRegleEntretien
{
    public string Nom => "Kit de distribution";

    public OffreEntretienResult? CalculerUrgence(Vehicule v, List<OrdreReparation> h)
    {
        var dernière = h
            .Where(o => o.TypeIntervention == TypeIntervention.Distribution
                     && o.Statut is ORStatut.Livré or ORStatut.TerminéTechnicien)
            .OrderByDescending(o => o.DateOuverture)
            .FirstOrDefault();

        var kmActuel = (int)v.KilométrageActuel;
        var today    = DateTime.UtcNow;

        int kmRestants;
        int joursRestants;

        if (dernière is null)
        {
            kmRestants    = 0;
            joursRestants = 0;
        }
        else
        {
            var kmDernière  = (int)(dernière.Vehicule?.KilométrageActuel ?? 0);
            kmRestants      = cfg.DistributionKm - (kmActuel - kmDernière);
            joursRestants   = cfg.DistributionJours - (int)(today - dernière.DateOuverture).TotalDays;
        }

        if (kmRestants > 5000 && joursRestants > 60) return null;

        var urgence = (kmRestants <= 0 || joursRestants <= 0) ? NiveauUrgence.Immédiat
                    : (kmRestants <= 2000 || joursRestants <= 30) ? NiveauUrgence.Bientôt
                    : NiveauUrgence.Préventif;

        return new OffreEntretienResult("Kit distribution", urgence,
            Math.Max(0, kmRestants), Math.Max(0, joursRestants),
            $"Remplacement kit distribution recommandé — {Math.Max(0, kmRestants)} km restants.");
    }
}

// ── Plaquettes de frein ──────────────────────────────────────────────────────
public sealed class ReglePlaquettesFrein(MaintenanceConfig cfg) : IRegleEntretien
{
    public string Nom => "Plaquettes de frein";

    public OffreEntretienResult? CalculerUrgence(Vehicule v, List<OrdreReparation> h)
    {
        var dernière = h
            .Where(o => o.TypeIntervention == TypeIntervention.Freinage
                     && o.Statut is ORStatut.Livré or ORStatut.TerminéTechnicien)
            .OrderByDescending(o => o.DateOuverture)
            .FirstOrDefault();

        var kmActuel = (int)v.KilométrageActuel;

        if (dernière is null)
        {
            if (kmActuel < cfg.PlaquettesKm) return null;
            return new OffreEntretienResult("Plaquettes de frein", NiveauUrgence.Bientôt,
                0, null, "Vérification des plaquettes de frein recommandée.");
        }

        var kmDernière = (int)(dernière.Vehicule?.KilométrageActuel ?? 0);
        var kmRestants = cfg.PlaquettesKm - (kmActuel - kmDernière);

        if (kmRestants > 3000) return null;

        var urgence = kmRestants <= 0 ? NiveauUrgence.Immédiat
                    : kmRestants <= 1000 ? NiveauUrgence.Bientôt
                    : NiveauUrgence.Préventif;

        return new OffreEntretienResult("Plaquettes de frein", urgence,
            Math.Max(0, kmRestants), null,
            $"Vérification plaquettes de frein — {Math.Max(0, kmRestants)} km restants.");
    }
}

// ── Vidange boîte de vitesses ─────────────────────────────────────────────────
public sealed class RegleVidangeBoite(MaintenanceConfig cfg) : IRegleEntretien
{
    public string Nom => "Vidange boîte de vitesses";

    public OffreEntretienResult? CalculerUrgence(Vehicule v, List<OrdreReparation> h)
    {
        // Look for OR with "Transmission" type as proxy for gearbox service
        var dernière = h
            .Where(o => o.TypeIntervention == TypeIntervention.Révision
                     && o.Statut is ORStatut.Livré or ORStatut.TerminéTechnicien)
            .OrderByDescending(o => o.DateOuverture)
            .FirstOrDefault();

        var kmActuel = (int)v.KilométrageActuel;
        var today    = DateTime.UtcNow;

        int kmRestants;
        int joursRestants;

        if (dernière is null)
        {
            kmRestants    = kmActuel >= cfg.BoiteKm ? 0 : cfg.BoiteKm - kmActuel;
            joursRestants = 0;
        }
        else
        {
            var kmDernière = (int)(dernière.Vehicule?.KilométrageActuel ?? 0);
            kmRestants     = cfg.BoiteKm - (kmActuel - kmDernière);
            joursRestants  = cfg.BoiteJours - (int)(today - dernière.DateOuverture).TotalDays;
        }

        if (kmRestants > 8000 && joursRestants > 90) return null;

        var urgence = (kmRestants <= 0 || joursRestants <= 0) ? NiveauUrgence.Immédiat
                    : (kmRestants <= 3000 || joursRestants <= 30) ? NiveauUrgence.Bientôt
                    : NiveauUrgence.Préventif;

        return new OffreEntretienResult("Vidange boîte", urgence,
            Math.Max(0, kmRestants), Math.Max(0, joursRestants),
            $"Vidange boîte de vitesses recommandée — {Math.Max(0, kmRestants)} km restants.");
    }
}

// ── Filtre habitacle ──────────────────────────────────────────────────────────
public sealed class RegleFiltreHabitacle(MaintenanceConfig cfg) : IRegleEntretien
{
    public string Nom => "Filtre habitacle";

    public OffreEntretienResult? CalculerUrgence(Vehicule v, List<OrdreReparation> h)
    {
        var dernière = h
            .Where(o => o.TypeIntervention is TypeIntervention.Révision or TypeIntervention.Climatisation
                     && o.Statut is ORStatut.Livré or ORStatut.TerminéTechnicien)
            .OrderByDescending(o => o.DateOuverture)
            .FirstOrDefault();

        var today         = DateTime.UtcNow;
        var joursRestants = dernière is null ? 0
            : cfg.FiltreHabitacleJours - (int)(today - dernière.DateOuverture).TotalDays;

        if (joursRestants > 60) return null;

        var urgence = joursRestants <= 0 ? NiveauUrgence.Immédiat
                    : joursRestants <= 30 ? NiveauUrgence.Bientôt
                    : NiveauUrgence.Préventif;

        return new OffreEntretienResult("Filtre habitacle", urgence,
            null, Math.Max(0, joursRestants),
            $"Remplacement filtre habitacle — {Math.Max(0, joursRestants)} jours restants.");
    }
}

// ── Révision générale ─────────────────────────────────────────────────────────
public sealed class RegleRevisionGenerale(MaintenanceConfig cfg) : IRegleEntretien
{
    public string Nom => "Révision générale";

    public OffreEntretienResult? CalculerUrgence(Vehicule v, List<OrdreReparation> h)
    {
        var dernière = h
            .Where(o => o.TypeIntervention == TypeIntervention.Révision
                     && o.Statut is ORStatut.Livré or ORStatut.TerminéTechnicien)
            .OrderByDescending(o => o.DateOuverture)
            .FirstOrDefault();

        var kmActuel = (int)v.KilométrageActuel;
        var today    = DateTime.UtcNow;

        int kmRestants;
        int joursRestants;

        if (dernière is null)
        {
            kmRestants    = 0;
            joursRestants = 0;
        }
        else
        {
            var kmDernière = (int)(dernière.Vehicule?.KilométrageActuel ?? 0);
            kmRestants     = cfg.RévisionKm - (kmActuel - kmDernière);
            joursRestants  = cfg.RévisionJours - (int)(today - dernière.DateOuverture).TotalDays;
        }

        if (kmRestants > 2000 && joursRestants > 45) return null;

        var urgence = (kmRestants <= 0 || joursRestants <= 0) ? NiveauUrgence.Immédiat
                    : (kmRestants <= 500 || joursRestants <= 15) ? NiveauUrgence.Bientôt
                    : NiveauUrgence.Préventif;

        return new OffreEntretienResult("Révision générale", urgence,
            Math.Max(0, kmRestants), Math.Max(0, joursRestants),
            $"Révision générale recommandée — {Math.Max(0, kmRestants)} km restants ou {Math.Max(0, joursRestants)} jours.");
    }
}
