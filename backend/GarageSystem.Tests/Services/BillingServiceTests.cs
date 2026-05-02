using FluentAssertions;
using GarageSystem.Api.DTOs.Billing;
using GarageSystem.Api.Services;
using GarageSystem.Domain.Entities;
using GarageSystem.Domain.Enums;
using GarageSystem.Domain.Exceptions;
using GarageSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GarageSystem.Tests.Services;

public class BillingServiceTests : IDisposable
{
    private readonly ApplicationDbContext _db;
    private readonly BillingService _sut;

    public BillingServiceTests()
    {
        var opt = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        _db  = new ApplicationDbContext(opt);
        _sut = new BillingService(_db);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<(Client client, Vehicule vehicule, OrdreReparation or)> SeedORAvecLignesAsync(
        ORStatut statutOR = ORStatut.TerminéTechnicien)
    {
        var client = new Client
        {
            Nom = "Amrani", Téléphone = "0555000001",
            Adresse = "Alger", Wilaya = Wilaya.Alger,
        };
        var vehicule = new Vehicule
        {
            Client = client, Immatriculation = "12345-001-16",
            Marque = "Renault", Modele = "Clio",
            Année = 2019, KilométrageActuel = 80000, IsActif = true,
        };
        var or = new OrdreReparation
        {
            Numéro = "OR-2024-0001", Vehicule = vehicule,
            TypeIntervention = TypeIntervention.Vidange,
            Statut = statutOR,
            Lignes = new List<LigneOR>
            {
                new() { Description = "Filtre à huile", Type = LigneORType.Pièce,
                        Quantité = 1, PrixUnitaire = 800 },
                new() { Description = "Main d'œuvre",   Type = LigneORType.MO,
                        Quantité = 1, PrixUnitaire = 1200 },
            },
        };
        _db.Clients.Add(client);
        _db.Vehicules.Add(vehicule);
        _db.OrdresReparation.Add(or);
        await _db.SaveChangesAsync();
        return (client, vehicule, or);
    }

    private async Task<Devis> SeedDevisAcceptéAsync()
    {
        var (_, _, or) = await SeedORAvecLignesAsync();
        var devis = new Devis
        {
            Numéro         = "DEV-2024-0001",
            ORId           = or.Id,
            ClientId       = or.Vehicule.ClientId,
            Statut         = DevisStatut.Accepté,
            DateExpiration = DateTime.UtcNow.AddDays(30),
            SousTotalHT    = 2000,
            MontantTVA     = 380,
            TotalTTC       = 2380,
            Lignes = new List<LigneDevis>
            {
                new() { Description = "Filtre", Quantité = 1, PrixUnitaireHT = 800, TauxTVA = 19 },
                new() { Description = "MO",     Quantité = 1, PrixUnitaireHT = 1200, TauxTVA = 19 },
            },
        };
        _db.Devis.Add(devis);
        await _db.SaveChangesAsync();
        return devis;
    }

    // ── CreateDevisFromOR ─────────────────────────────────────────────────────

    [Fact]
    public async Task CreateDevisFromOR_CasNominal_CréeDevisAvecBonsTotaux()
    {
        var (_, _, or) = await SeedORAvecLignesAsync();

        var result = await _sut.CreateDevisFromORAsync(or.Id);

        result.Should().NotBeNull();
        result.Numéro.Should().StartWith("DEV-");
        result.Statut.Should().Be(DevisStatut.Brouillon);
        result.SousTotalHT.Should().Be(2000);
        result.MontantTVA.Should().Be(380);
        result.TotalTTC.Should().Be(2380);
        result.Lignes.Should().HaveCount(2);
    }

    [Fact]
    public async Task CreateDevisFromOR_ORInexistant_LeveNotFoundException()
    {
        var act = async () => await _sut.CreateDevisFromORAsync(Guid.NewGuid());
        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task CreateDevisFromOR_DevisActifExistantPourMêmeOR_LeveConflictException()
    {
        var (_, _, or) = await SeedORAvecLignesAsync();
        _db.Devis.Add(new Devis
        {
            Numéro         = "DEV-2024-0001",
            ORId           = or.Id,
            ClientId       = or.Vehicule.ClientId,
            Statut         = DevisStatut.Validé,
            DateExpiration = DateTime.UtcNow.AddDays(30),
        });
        await _db.SaveChangesAsync();

        var act = async () => await _sut.CreateDevisFromORAsync(or.Id);
        await act.Should().ThrowAsync<ConflictException>().WithMessage("*devis actif*");
    }

    // ── Transitions Devis ─────────────────────────────────────────────────────

    [Fact]
    public async Task ValiderDevis_StatutBrouillon_RetourneDevisValidé()
    {
        var (_, _, or) = await SeedORAvecLignesAsync();
        var devis = await _sut.CreateDevisFromORAsync(or.Id);

        var result = await _sut.ValiderDevisAsync(devis.Id);

        result.Statut.Should().Be(DevisStatut.Validé);
    }

    [Fact]
    public async Task ValiderDevis_StatutNonBrouillon_LeveBusinessRuleException()
    {
        var (_, _, or) = await SeedORAvecLignesAsync();
        _db.Devis.Add(new Devis
        {
            Numéro = "DEV-2024-0002", ORId = or.Id, ClientId = or.Vehicule.ClientId,
            Statut = DevisStatut.EnvoyéClient, DateExpiration = DateTime.UtcNow.AddDays(30),
        });
        await _db.SaveChangesAsync();
        var id = _db.Devis.First(d => d.Statut == DevisStatut.EnvoyéClient).Id;

        var act = async () => await _sut.ValiderDevisAsync(id);
        await act.Should().ThrowAsync<BusinessRuleException>();
    }

    [Fact]
    public async Task EnvoyerDevis_StatutValidé_TransitionEnvoyéClient()
    {
        var (_, _, or) = await SeedORAvecLignesAsync();
        var devis = await _sut.CreateDevisFromORAsync(or.Id);
        await _sut.ValiderDevisAsync(devis.Id);

        var result = await _sut.EnvoyerDevisAsync(devis.Id);

        result.Statut.Should().Be(DevisStatut.EnvoyéClient);
        result.DateEnvoi.Should().NotBeNull();
    }

    [Fact]
    public async Task RefuserDevis_AvecMotif_MarqueRefuséEtStockeMotif()
    {
        var (_, _, or) = await SeedORAvecLignesAsync();
        var devis = await _sut.CreateDevisFromORAsync(or.Id);
        await _sut.ValiderDevisAsync(devis.Id);
        await _sut.EnvoyerDevisAsync(devis.Id);

        var result = await _sut.RefuserDevisAsync(devis.Id, "Prix trop élevé");

        result.Statut.Should().Be(DevisStatut.Refusé);
        var stored = await _db.Devis.FindAsync(devis.Id);
        stored!.MotifRefus.Should().Be("Prix trop élevé");
    }

    [Fact]
    public async Task RefuserDevis_DéjàRefusé_LeveBusinessRuleException()
    {
        _db.Devis.Add(new Devis
        {
            Numéro = "DEV-X", ORId = Guid.NewGuid(), ClientId = Guid.NewGuid(),
            Statut = DevisStatut.Refusé, DateExpiration = DateTime.UtcNow.AddDays(30),
        });
        await _db.SaveChangesAsync();
        var id = _db.Devis.First().Id;

        var act = async () => await _sut.RefuserDevisAsync(id, "motif");
        await act.Should().ThrowAsync<BusinessRuleException>().WithMessage("*clôturé*");
    }

    // ── CreateFactureFromDevis ────────────────────────────────────────────────

    [Fact]
    public async Task CreateFactureFromDevis_CasNominal_CréeFactureEtPasseORLivré()
    {
        var devis = await SeedDevisAcceptéAsync();

        var result = await _sut.CreateFactureFromDevisAsync(devis.Id);

        result.Should().NotBeNull();
        result.Numéro.Should().StartWith("FAC-");
        result.TotalTTC.Should().Be(2380);
        result.Statut.Should().Be(FactureStatut.Emise);

        var or = await _db.OrdresReparation.FirstAsync();
        or.Statut.Should().Be(ORStatut.Livré);
    }

    [Fact]
    public async Task CreateFactureFromDevis_DevisNonAccepté_LeveBusinessRuleException()
    {
        var (_, _, or) = await SeedORAvecLignesAsync();
        var devis = await _sut.CreateDevisFromORAsync(or.Id);

        var act = async () => await _sut.CreateFactureFromDevisAsync(devis.Id);
        await act.Should().ThrowAsync<BusinessRuleException>().WithMessage("*Accepté*");
    }

    [Fact]
    public async Task CreateFactureFromDevis_FactureExistante_LeveConflictException()
    {
        var devis = await SeedDevisAcceptéAsync();
        await _sut.CreateFactureFromDevisAsync(devis.Id);

        var act = async () => await _sut.CreateFactureFromDevisAsync(devis.Id);
        await act.Should().ThrowAsync<Exception>();
    }

    // ── EnregistrerPaiement ───────────────────────────────────────────────────

    private async Task<Facture> SeedFactureÉmiseAsync(decimal totalTTC = 2380)
    {
        var f = new Facture
        {
            Numéro = "FAC-2024-0001", ClientNom = "Amrani",
            ClientAdresse = "Alger", TotalTTC = totalTTC,
            SousTotalHT = totalTTC / 1.19m,
            MontantTVA  = totalTTC - totalTTC / 1.19m,
            DateFacture  = DateTime.UtcNow,
            DateEchéance = DateTime.UtcNow.AddDays(30),
            Statut = FactureStatut.Emise,
        };
        _db.Factures.Add(f);
        await _db.SaveChangesAsync();
        return f;
    }

    [Fact]
    public async Task EnregistrerPaiement_MontantTotal_MarqueSoldée()
    {
        var f = await SeedFactureÉmiseAsync();
        var dto = new EnregistrerPaiementDto(2380, ModePaiement.Espèces, null, DateTime.UtcNow.Date);

        var result = await _sut.EnregistrerPaiementAsync(f.Id, dto, "user-1");

        result.Statut.Should().Be(FactureStatut.Soldee);
        result.MontantDéjàPayé.Should().Be(2380);
        result.RestantDû.Should().Be(0);
    }

    [Fact]
    public async Task EnregistrerPaiement_PaiementPartiel_MarquePartiellemntPayée()
    {
        var f = await SeedFactureÉmiseAsync();
        var dto = new EnregistrerPaiementDto(1000, ModePaiement.Espèces, null, DateTime.UtcNow.Date);

        var result = await _sut.EnregistrerPaiementAsync(f.Id, dto, "user-1");

        result.Statut.Should().Be(FactureStatut.PartiellementPayee);
        result.MontantDéjàPayé.Should().Be(1000);
        result.RestantDû.Should().Be(1380);
    }

    [Fact]
    public async Task EnregistrerPaiement_MontantSupérieurRestant_LeveBusinessRuleException()
    {
        var f = await SeedFactureÉmiseAsync();
        var dto = new EnregistrerPaiementDto(9999, ModePaiement.Espèces, null, DateTime.UtcNow.Date);

        var act = async () => await _sut.EnregistrerPaiementAsync(f.Id, dto, "user-1");
        await act.Should().ThrowAsync<BusinessRuleException>().WithMessage("*restant dû*");
    }

    [Fact]
    public async Task EnregistrerPaiement_MontantNégatif_LeveBusinessRuleException()
    {
        var f = await SeedFactureÉmiseAsync();
        var dto = new EnregistrerPaiementDto(-100, ModePaiement.Espèces, null, DateTime.UtcNow.Date);

        var act = async () => await _sut.EnregistrerPaiementAsync(f.Id, dto, "user-1");
        await act.Should().ThrowAsync<BusinessRuleException>();
    }

    [Fact]
    public async Task EnregistrerPaiement_FactureSoldée_LeveConflictException()
    {
        var f = await SeedFactureÉmiseAsync();
        f.Statut = FactureStatut.Soldee;
        await _db.SaveChangesAsync();
        var dto = new EnregistrerPaiementDto(100, ModePaiement.Espèces, null, DateTime.UtcNow.Date);

        var act = async () => await _sut.EnregistrerPaiementAsync(f.Id, dto, "user-1");
        await act.Should().ThrowAsync<ConflictException>();
    }

    // ── AnnulerFacture ────────────────────────────────────────────────────────

    [Fact]
    public async Task AnnulerFacture_FactureÉmise_MarqueAnnulée()
    {
        var f = await SeedFactureÉmiseAsync();

        await _sut.AnnulerFactureAsync(f.Id, "Erreur de saisie");

        var updated = await _db.Factures.FindAsync(f.Id);
        updated!.Statut.Should().Be(FactureStatut.Annulee);
        updated.MotifsAnnulation.Should().Be("Erreur de saisie");
    }

    [Fact]
    public async Task AnnulerFacture_DéjàAnnulée_LeveBusinessRuleException()
    {
        var f = await SeedFactureÉmiseAsync();
        f.Statut = FactureStatut.Annulee;
        await _db.SaveChangesAsync();

        var act = async () => await _sut.AnnulerFactureAsync(f.Id, "motif");
        await act.Should().ThrowAsync<BusinessRuleException>().WithMessage("*déjà annulée*");
    }

    public void Dispose() => _db.Dispose();
}
