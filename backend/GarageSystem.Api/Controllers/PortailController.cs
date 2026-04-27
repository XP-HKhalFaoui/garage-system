using GarageSystem.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GarageSystem.Api.Controllers;

/// <summary>
/// Portail client public — accès par token GUID stocké dans Client.PortailToken.
/// </summary>
[ApiController]
[Route("api/portail")]
public class PortailController(ApplicationDbContext db) : ControllerBase
{
    [HttpGet("{token}")]
    public async Task<IActionResult> GetPortail(string token)
    {
        if (!Guid.TryParse(token, out var tokenGuid))
            return BadRequest(new { error = "Token invalide" });

        var client = await db.Clients
            .Where(c => c.PortailToken == tokenGuid)
            .Select(c => new {
                c.Id, c.NomComplet, c.Téléphone, c.Email,
                Véhicules = c.Vehicules.Select(v => new {
                    v.Id, v.Immatriculation, v.Marque, v.Modele, v.Année, v.KilométrageActuel
                }),
            })
            .FirstOrDefaultAsync();

        if (client == null)
            return NotFound(new { error = "Portail introuvable" });

        return Ok(client);
    }

    [HttpGet("{token}/vehicule/{vehiculeId:guid}/or")]
    public async Task<IActionResult> GetORVehicule(string token, Guid vehiculeId)
    {
        if (!Guid.TryParse(token, out var tokenGuid))
            return BadRequest();

        var owns = await db.Vehicules
            .AnyAsync(v => v.Id == vehiculeId && v.Client.PortailToken == tokenGuid);

        if (!owns) return NotFound();

        var ordres = await db.OrdresReparation
            .Where(o => o.VehiculeId == vehiculeId)
            .OrderByDescending(o => o.DateCreation)
            .Select(o => new {
                o.Id, o.Numéro, o.Statut, o.TypeIntervention,
                o.DateCreation, o.DateFermeture, o.MontantTotal,
                NbLignes = o.Lignes.Count,
            })
            .Take(10)
            .ToListAsync();

        return Ok(ordres);
    }

    [HttpGet("{token}/factures")]
    public async Task<IActionResult> GetFactures(string token)
    {
        if (!Guid.TryParse(token, out var tokenGuid))
            return BadRequest();

        // Retrouver le client via le token
        var client = await db.Clients
            .Where(c => c.PortailToken == tokenGuid)
            .Select(c => new { c.Id, c.NomComplet })
            .FirstOrDefaultAsync();

        if (client == null) return NotFound();

        // Les factures sont liées via OR → Vehicule → Client
        var vehiculeIds = await db.Vehicules
            .Where(v => v.ClientId == client.Id)
            .Select(v => v.Id)
            .ToListAsync();

        var factures = await db.Factures
            .Where(f => f.ORId != null && db.OrdresReparation
                .Where(o => vehiculeIds.Contains(o.VehiculeId))
                .Select(o => (Guid?)o.Id)
                .Contains(f.ORId))
            .OrderByDescending(f => f.DateCreation)
            .Select(f => new {
                f.Id, f.Numéro, f.Statut, f.TotalTTC,
                f.MontantDéjàPayé, RestantDû = f.TotalTTC - f.MontantDéjàPayé,
                f.DateFacture, f.DateEchéance,
            })
            .Take(20)
            .ToListAsync();

        return Ok(factures);
    }

    [HttpPost("generer-token/{clientId:guid}")]
    public async Task<IActionResult> GénérerToken(Guid clientId)
    {
        var client = await db.Clients.FindAsync(clientId);
        if (client == null) return NotFound();

        client.PortailToken = Guid.NewGuid();
        await db.SaveChangesAsync();

        return Ok(new { token = client.PortailToken, url = $"/portail/{client.PortailToken}" });
    }
}
