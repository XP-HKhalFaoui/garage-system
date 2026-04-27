using FluentAssertions;
using GarageSystem.Domain.Entities;
using GarageSystem.Domain.Enums;
using GarageSystem.Domain.Services.Maintenance;
using Microsoft.Extensions.Options;
using NiveauUrgence = GarageSystem.Domain.Services.Maintenance.NiveauUrgence;

namespace GarageSystem.Tests.Domain;

public class MoteurOffresServiceTests
{
    private readonly MoteurOffresService _sut;
    private readonly MaintenanceConfig _cfg;

    public MoteurOffresServiceTests()
    {
        _cfg = new MaintenanceConfig();
        _sut = new MoteurOffresService(Options.Create(_cfg));
    }

    private static Vehicule NewVehicule(decimal km = 10000) => new()
    {
        Immatriculation = "12345-001-16", Marque = "Toyota", Modele = "Yaris",
        Année = 2020, KilométrageActuel = km, IsActif = true,
    };

    private static OrdreReparation NewOR(TypeIntervention type, ORStatut statut,
        DateTime? date = null, decimal kmVehicule = 0)
    {
        var or = new OrdreReparation
        {
            Numéro = Guid.NewGuid().ToString()[..8],
            TypeIntervention = type,
            Statut = statut,
            DateOuverture = date ?? DateTime.UtcNow.AddDays(-10),
            Vehicule = new Vehicule { KilométrageActuel = kmVehicule },
        };
        return or;
    }

    // ── Moteur global ─────────────────────────────────────────────────────────

    [Fact]
    public void CalculerOffres_VéhiculeSansHistorique_RetourneOffresUrgentes()
    {
        var v = NewVehicule(km: 80000);

        var offres = _sut.CalculerOffres(v, new List<OrdreReparation>());

        offres.Should().NotBeEmpty();
        offres.Should().Contain(o => o.Urgence == NiveauUrgence.Immédiat);
    }

    [Fact]
    public void CalculerOffres_VéhiculeNeuveAvecEntretienRécent_RetourneListeVide()
    {
        var v = NewVehicule(km: 1000);
        var historique = new List<OrdreReparation>
        {
            NewOR(TypeIntervention.Vidange,    ORStatut.Livré, DateTime.UtcNow.AddDays(-10),  kmVehicule: 500),
            NewOR(TypeIntervention.Révision,   ORStatut.Livré, DateTime.UtcNow.AddDays(-10),  kmVehicule: 500),
            NewOR(TypeIntervention.Distribution, ORStatut.Livré, DateTime.UtcNow.AddDays(-10), kmVehicule: 500),
            NewOR(TypeIntervention.Freinage,   ORStatut.Livré, DateTime.UtcNow.AddDays(-10),  kmVehicule: 500),
        };

        var offres = _sut.CalculerOffres(v, historique);

        offres.Should().BeEmpty();
    }

    [Fact]
    public void CalculerOffres_RésultatTriéParUrgence_ImmédiatEnPremier()
    {
        var v = NewVehicule(km: 50000);
        var historique = new List<OrdreReparation>
        {
            // Vidange très en retard → Immédiat
            NewOR(TypeIntervention.Vidange, ORStatut.Livré, DateTime.UtcNow.AddDays(-400), kmVehicule: 30000),
            // Révision bientôt due
            NewOR(TypeIntervention.Révision, ORStatut.Livré, DateTime.UtcNow.AddDays(-340), kmVehicule: 35500),
        };

        var offres = _sut.CalculerOffres(v, historique);

        offres.Should().NotBeEmpty();
        offres.First().Urgence.Should().Be(NiveauUrgence.Immédiat);
    }

    // ── Vidange huile ─────────────────────────────────────────────────────────

    [Fact]
    public void VidangeHuile_PasDeHistorique_RetourneImmédiat()
    {
        var règle = new RegleVidangeHuile(_cfg);
        var v = NewVehicule(km: 50000);

        var result = règle.CalculerUrgence(v, new List<OrdreReparation>());

        result.Should().NotBeNull();
        result!.Urgence.Should().Be(NiveauUrgence.Immédiat);
        result.Type.Should().Be("Vidange huile");
    }

    [Fact]
    public void VidangeHuile_EntretienRécent_RetourneNull()
    {
        var règle = new RegleVidangeHuile(_cfg);
        var v = NewVehicule(km: 11000);
        var historique = new List<OrdreReparation>
        {
            NewOR(TypeIntervention.Vidange, ORStatut.Livré, DateTime.UtcNow.AddDays(-30), kmVehicule: 10500),
        };

        var result = règle.CalculerUrgence(v, historique);

        result.Should().BeNull();
    }

    [Fact]
    public void VidangeHuile_KmDepassé_RetourneImmédiat()
    {
        var règle = new RegleVidangeHuile(_cfg);
        var v = NewVehicule(km: 20000);
        var historique = new List<OrdreReparation>
        {
            NewOR(TypeIntervention.Vidange, ORStatut.Livré, DateTime.UtcNow.AddDays(-10), kmVehicule: 14000),
        };

        var result = règle.CalculerUrgence(v, historique);

        result.Should().NotBeNull();
        result!.Urgence.Should().Be(NiveauUrgence.Immédiat);
        result.KmRestants.Should().Be(0);
    }

    [Fact]
    public void VidangeHuile_KmProche_RetourneBientôt()
    {
        var règle = new RegleVidangeHuile(_cfg);
        var v = NewVehicule(km: 14700);
        var historique = new List<OrdreReparation>
        {
            NewOR(TypeIntervention.Vidange, ORStatut.Livré, DateTime.UtcNow.AddDays(-10), kmVehicule: 10000),
        };

        var result = règle.CalculerUrgence(v, historique);

        result.Should().NotBeNull();
        result!.Urgence.Should().Be(NiveauUrgence.Bientôt);
        result.KmRestants.Should().BeInRange(0, 500);
    }

    // ── Plaquettes de frein ───────────────────────────────────────────────────

    [Fact]
    public void Plaquettes_KmTotauxInférieurSeuil_RetourneNull()
    {
        var règle = new ReglePlaquettesFrein(_cfg);
        var v = NewVehicule(km: 5000);

        var result = règle.CalculerUrgence(v, new List<OrdreReparation>());

        result.Should().BeNull();
    }

    [Fact]
    public void Plaquettes_SansHistoriqueKmDépasséSeuil_RetourneBientôt()
    {
        var règle = new ReglePlaquettesFrein(_cfg);
        var v = NewVehicule(km: 30000);

        var result = règle.CalculerUrgence(v, new List<OrdreReparation>());

        result.Should().NotBeNull();
        result!.Urgence.Should().Be(NiveauUrgence.Bientôt);
    }

    [Fact]
    public void Plaquettes_KmDepuisDernierFreinageDepassé_RetourneImmédiat()
    {
        var règle = new ReglePlaquettesFrein(_cfg);
        var v = NewVehicule(km: 40000);
        var historique = new List<OrdreReparation>
        {
            NewOR(TypeIntervention.Freinage, ORStatut.Livré, DateTime.UtcNow.AddDays(-100), kmVehicule: 14500),
        };

        var result = règle.CalculerUrgence(v, historique);

        result.Should().NotBeNull();
        result!.Urgence.Should().Be(NiveauUrgence.Immédiat);
    }

    // ── Kit distribution ──────────────────────────────────────────────────────

    [Fact]
    public void Distribution_PasDeHistorique_RetourneImmédiat()
    {
        var règle = new RegleKitDistribution(_cfg);
        var v = NewVehicule(km: 80000);

        var result = règle.CalculerUrgence(v, new List<OrdreReparation>());

        result.Should().NotBeNull();
        result!.Urgence.Should().Be(NiveauUrgence.Immédiat);
    }

    [Fact]
    public void Distribution_DistributionRécenteAvecKmCorrects_RetourneNull()
    {
        var règle = new RegleKitDistribution(_cfg);
        var v = NewVehicule(km: 30000);
        var historique = new List<OrdreReparation>
        {
            NewOR(TypeIntervention.Distribution, ORStatut.Livré, DateTime.UtcNow.AddDays(-100), kmVehicule: 25000),
        };

        var result = règle.CalculerUrgence(v, historique);

        result.Should().BeNull();
    }

    // ── Révision générale ─────────────────────────────────────────────────────

    [Fact]
    public void Révision_PasDeHistorique_RetourneImmédiat()
    {
        var règle = new RegleRevisionGenerale(_cfg);
        var v = NewVehicule(km: 50000);

        var result = règle.CalculerUrgence(v, new List<OrdreReparation>());

        result.Should().NotBeNull();
        result!.Urgence.Should().Be(NiveauUrgence.Immédiat);
    }

    [Fact]
    public void Révision_RécemmentFaite_RetourneNull()
    {
        var règle = new RegleRevisionGenerale(_cfg);
        var v = NewVehicule(km: 16000);
        var historique = new List<OrdreReparation>
        {
            NewOR(TypeIntervention.Révision, ORStatut.Livré, DateTime.UtcNow.AddDays(-30), kmVehicule: 15000),
        };

        var result = règle.CalculerUrgence(v, historique);

        result.Should().BeNull();
    }
}
