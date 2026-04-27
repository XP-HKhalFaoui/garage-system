using GarageSystem.Api.DTOs.OR;
using GarageSystem.Api.Hubs;
using GarageSystem.Api.Services;
using GarageSystem.Domain.Entities;
using GarageSystem.Domain.Enums;
using GarageSystem.Domain.Exceptions;
using GarageSystem.Infrastructure.Persistence;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Moq;
using FluentAssertions;

namespace GarageSystem.Tests.Services;

public class OrdreReparationServiceTests : IDisposable
{
    private readonly ApplicationDbContext _db;
    private readonly OrdreReparationService _sut;

    public OrdreReparationServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        _db = new ApplicationDbContext(options);

        var hubMock   = new Mock<IHubContext<OrdresHub>>();
        var clientsMock = new Mock<IHubClients>();
        var clientProxy = new Mock<IClientProxy>();
        hubMock.Setup(h => h.Clients).Returns(clientsMock.Object);
        clientsMock.Setup(c => c.All).Returns(clientProxy.Object);

        var cache = new MemoryCache(new MemoryCacheOptions());
        _sut = new OrdreReparationService(_db, hubMock.Object, cache);
    }

    private async Task<(Client client, Vehicule vehicule)> SeedVehiculeAsync(decimal km = 10000)
    {
        var client = new Client
        {
            Nom = "Ben Ali", Téléphone = "0555000001",
            Adresse = "Alger", Wilaya = Wilaya.Alger,
        };
        var vehicule = new Vehicule
        {
            Client = client, Immatriculation = "12345-001-16",
            Marque = "Peugeot", Modele = "208",
            Année = 2020, KilométrageActuel = km, IsActif = true,
        };
        _db.Clients.Add(client);
        _db.Vehicules.Add(vehicule);
        await _db.SaveChangesAsync();
        return (client, vehicule);
    }

    [Fact]
    public async Task CreateAsync_CasNominal_RetourneOR()
    {
        var (_, v) = await SeedVehiculeAsync();
        var dto = new CreateORDto(v.Id, null, 10500, TypeIntervention.Vidange, ORPriorité.Normal, null);

        var result = await _sut.CreateAsync(dto, "user-1");

        result.Should().NotBeNull();
        result.Numéro.Should().StartWith("OR-");
        result.Statut.Should().Be(ORStatut.EnAttente);
    }

    [Fact]
    public async Task CreateAsync_VehiculeInexistant_LeveNotFoundException()
    {
        var dto = new CreateORDto(Guid.NewGuid(), null, 1000, TypeIntervention.Diagnostic, ORPriorité.Normal, null);
        var act = async () => await _sut.CreateAsync(dto, "user-1");
        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task CreateAsync_ORDejaActif_LeveBusinessRuleException()
    {
        var (_, v) = await SeedVehiculeAsync();
        _db.OrdresReparation.Add(new OrdreReparation
        {
            Numéro = "OR-2024-0001", VehiculeId = v.Id, Statut = ORStatut.EnCours,
            TypeIntervention = TypeIntervention.Révision,
        });
        await _db.SaveChangesAsync();

        var dto = new CreateORDto(v.Id, null, 10000, TypeIntervention.Vidange, ORPriorité.Normal, null);
        var act = async () => await _sut.CreateAsync(dto, "user-1");
        await act.Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*déjà un OR actif*");
    }

    [Fact]
    public async Task CreateAsync_KmInférieur_LeveBusinessRuleException()
    {
        var (_, v) = await SeedVehiculeAsync(km: 50000);
        var dto = new CreateORDto(v.Id, null, 49000, TypeIntervention.Vidange, ORPriorité.Normal, null);
        var act = async () => await _sut.CreateAsync(dto, "user-1");
        await act.Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*inférieur*");
    }

    public void Dispose() => _db.Dispose();
}
