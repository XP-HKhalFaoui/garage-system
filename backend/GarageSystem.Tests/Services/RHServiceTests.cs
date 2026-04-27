using FluentAssertions;
using GarageSystem.Api.DTOs.RH;
using GarageSystem.Api.Services;
using GarageSystem.Domain.Entities;
using GarageSystem.Domain.Enums;
using GarageSystem.Domain.Exceptions;
using GarageSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GarageSystem.Tests.Services;

public class RHServiceTests : IDisposable
{
    private readonly ApplicationDbContext _db;
    private readonly RHService _sut;

    public RHServiceTests()
    {
        var opt = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        _db  = new ApplicationDbContext(opt);
        _sut = new RHService(_db);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<Employe> SeedEmployeAsync(bool actif = true)
    {
        var e = new Employe
        {
            Nom = "Khelil", Prénom = "Karim",
            Téléphone = "0555000099",
            Poste = TypePoste.Technicien, Département = "Atelier",
            SalaireBase = 50000, TypeContrat = TypeContrat.CDI,
            DateEmbauche = new DateTime(2022, 1, 1),
            IsActif = actif,
        };
        _db.Employes.Add(e);
        await _db.SaveChangesAsync();
        return e;
    }

    // ── CreateEmploye ─────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateEmploye_CasNominal_RetourneEmployeAvecId()
    {
        var dto = new CreateEmployeDto(
            "Benali", "Sofiane", new DateTime(1990, 5, 10),
            "0555111222", null, "Alger",
            TypePoste.Technicien, "Atelier",
            45000, TypeContrat.CDI,
            new DateTime(2024, 1, 1), null);

        var result = await _sut.CreateEmployeAsync(dto);

        result.Should().NotBeNull();
        result.Id.Should().NotBeEmpty();
        result.Nom.Should().Be("Benali");
        result.IsActif.Should().BeTrue();
    }

    // ── UpdateEmploye ─────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateEmploye_EmployeExistant_MiseAJourChamps()
    {
        var e = await SeedEmployeAsync();
        var dto = new UpdateEmployeDto(
            "KhelilUpdated", "Karim", "0555000001",
            "karim@example.com", "Oran",
            TypePoste.Admin, "Direction",
            60000, TypeContrat.CDI, null);

        var result = await _sut.UpdateEmployeAsync(e.Id, dto);

        result.Nom.Should().Be("KhelilUpdated");
        result.SalaireBase.Should().Be(60000);
        result.Département.Should().Be("Direction");
    }

    [Fact]
    public async Task UpdateEmploye_EmployeInexistant_LeveNotFoundException()
    {
        var dto = new UpdateEmployeDto("X", "Y", "0555000000",
            null, "X", TypePoste.Technicien, "X", 0, TypeContrat.CDD, null);

        var act = async () => await _sut.UpdateEmployeAsync(Guid.NewGuid(), dto);
        await act.Should().ThrowAsync<NotFoundException>();
    }

    // ── Desactiver ────────────────────────────────────────────────────────────

    [Fact]
    public async Task Desactiver_EmployeActif_MarqueInactif()
    {
        var e = await SeedEmployeAsync();

        await _sut.DesactiverAsync(e.Id);

        var updated = await _db.Employes.FindAsync(e.Id);
        updated!.IsActif.Should().BeFalse();
    }

    [Fact]
    public async Task Desactiver_EmployeInexistant_LeveNotFoundException()
    {
        var act = async () => await _sut.DesactiverAsync(Guid.NewGuid());
        await act.Should().ThrowAsync<NotFoundException>();
    }

    // ── Pointage ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task EnregistrerEntrée_PremièreFoisAujourdHui_CréePointage()
    {
        var e = await SeedEmployeAsync();

        var result = await _sut.EnregistrerEntréeAsync(e.Id);

        result.Should().NotBeNull();
        result.Date.Should().Be(DateOnly.FromDateTime(DateTime.Now));
        result.HeureEntrée.Should().NotBe(TimeOnly.MinValue);
        result.HeureSortie.Should().BeNull();
    }

    [Fact]
    public async Task EnregistrerEntrée_DeuxièmeFoisMêmeJour_LeveConflictException()
    {
        var e = await SeedEmployeAsync();
        await _sut.EnregistrerEntréeAsync(e.Id);

        var act = async () => await _sut.EnregistrerEntréeAsync(e.Id);
        await act.Should().ThrowAsync<ConflictException>().WithMessage("*déjà*");
    }

    [Fact]
    public async Task EnregistrerEntrée_EmployeInexistant_LeveNotFoundException()
    {
        var act = async () => await _sut.EnregistrerEntréeAsync(Guid.NewGuid());
        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task EnregistrerSortie_ApresEntrée_CalculeHeuresTravaillées()
    {
        var e = await SeedEmployeAsync();

        // Seed manuellement un pointage avec entrée il y a 8h
        var entrée = TimeOnly.FromTimeSpan(TimeSpan.FromHours(DateTime.Now.Hour - 8));
        _db.Pointages.Add(new Pointage
        {
            EmployeId   = e.Id,
            Date        = DateOnly.FromDateTime(DateTime.Now),
            HeureEntrée = entrée,
            TypeJour    = TypeJour.Travaillé,
        });
        await _db.SaveChangesAsync();

        var result = await _sut.EnregistrerSortieAsync(e.Id);

        result.HeureSortie.Should().NotBe(TimeOnly.MinValue);
        result.NbHeuresTravaillées.Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task EnregistrerSortie_SansEntréeAujourdHui_LeveNotFoundException()
    {
        var e = await SeedEmployeAsync();

        var act = async () => await _sut.EnregistrerSortieAsync(e.Id);
        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task EnregistrerSortie_EntréeDéjàFermée_LeveNotFoundException()
    {
        var e = await SeedEmployeAsync();
        _db.Pointages.Add(new Pointage
        {
            EmployeId   = e.Id,
            Date        = DateOnly.FromDateTime(DateTime.Now),
            HeureEntrée = new TimeOnly(8, 0),
            HeureSortie = new TimeOnly(17, 0),
            TypeJour    = TypeJour.Travaillé,
        });
        await _db.SaveChangesAsync();

        var act = async () => await _sut.EnregistrerSortieAsync(e.Id);
        await act.Should().ThrowAsync<NotFoundException>();
    }

    // ── GetEmployes ───────────────────────────────────────────────────────────

    [Fact]
    public async Task GetEmployes_FiltreActif_RetourneSeulementActifs()
    {
        await SeedEmployeAsync(actif: true);
        await SeedEmployeAsync(actif: false);

        var (items, total) = await _sut.GetEmployesAsync(null, null, actif: true, 1, 20, false);

        items.Should().HaveCount(1);
        total.Should().Be(1);
        items.All(e => e.IsActif).Should().BeTrue();
    }

    public void Dispose() => _db.Dispose();
}
