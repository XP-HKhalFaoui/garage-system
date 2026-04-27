using GarageSystem.Api.DTOs.RH;
using GarageSystem.Api.Services;
using GarageSystem.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GarageSystem.Api.Controllers;

// ── Employés ──────────────────────────────────────────────────────────────────
[ApiController]
[Route("api/employes")]
[Authorize]
public class EmployesController(RHService svc) : ControllerBase
{
    private bool CanSeeSalary => User.IsInRole("Admin") || User.IsInRole("RH");
    private Guid UserId => Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] TypePoste? poste, [FromQuery] string? département,
        [FromQuery] bool? actif, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var (items, total) = await svc.GetEmployesAsync(poste, département, actif, page, pageSize, CanSeeSalary);
        return Ok(new { items, total, page, pageSize });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
        => Ok(await svc.GetEmployeAsync(id, CanSeeSalary));

    [HttpPost]
    [Authorize(Roles = "Admin,RH")]
    public async Task<IActionResult> Create([FromBody] CreateEmployeDto dto)
    {
        var result = await svc.CreateEmployeAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin,RH")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateEmployeDto dto)
        => Ok(await svc.UpdateEmployeAsync(id, dto));

    [HttpPatch("{id:guid}/desactiver")]
    [Authorize(Roles = "Admin,RH")]
    public async Task<IActionResult> Desactiver(Guid id)
    {
        await svc.DesactiverAsync(id);
        return NoContent();
    }
}

// ── Pointage ──────────────────────────────────────────────────────────────────
[ApiController]
[Route("api/pointage")]
[Authorize]
public class PointageController(RHService svc) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

    [HttpPost("entree")]
    public async Task<IActionResult> Entree([FromBody] PointageEntréeDto dto)
    {
        var empId = dto.EmployeId ?? await GetEmployeIdFromUserAsync(svc);
        return Ok(await svc.EnregistrerEntréeAsync(empId));
    }

    [HttpPost("sortie")]
    public async Task<IActionResult> Sortie([FromBody] PointageSortieDto dto)
    {
        var empId = dto.EmployeId ?? await GetEmployeIdFromUserAsync(svc);
        return Ok(await svc.EnregistrerSortieAsync(empId));
    }

    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] Guid? employeId, [FromQuery] string? mois)
        => Ok(await svc.GetPointageAsync(employeId, mois));

    [HttpGet("aujourd-hui")]
    public async Task<IActionResult> GetAujourdHui()
        => Ok(await svc.GetPrésentAujourdHuiAsync());

    [HttpGet("mensuel/{employeId:guid}/{annee:int}/{mois:int}")]
    public async Task<IActionResult> GetMensuel(Guid employeId, int annee, int mois)
        => Ok(await svc.GetPointageMensuelAsync(employeId, annee, mois));

    // Helper: retrouver l'employé lié à l'utilisateur connecté
    private static Task<Guid> GetEmployeIdFromUserAsync(RHService svc)
        => Task.FromResult(Guid.Empty); // TODO: relier AppUser → Employe
}

// ── Paie ──────────────────────────────────────────────────────────────────────
[ApiController]
[Route("api/paie")]
[Authorize(Roles = "Admin,RH")]
public class PaieController(RHService svc) : ControllerBase
{
    [HttpPost("calculer")]
    public async Task<IActionResult> Calculer([FromBody] CalculerPaieDto dto)
        => Ok(await svc.CalculerBulletinAsync(dto));

    [HttpGet("{employeId:guid}")]
    public async Task<IActionResult> GetBulletins(Guid employeId)
        => Ok(await svc.GetBulletinsAsync(employeId));

    [HttpPatch("{id:guid}/marquer-paye")]
    public async Task<IActionResult> MarquerPayé(Guid id, [FromBody] MarquerPayéDto dto)
        => Ok(await svc.MarquerPayéAsync(id, dto));

    [HttpPost("primes")]
    public async Task<IActionResult> AddPrime([FromBody] CreatePrimeDto dto)
        => Ok(await svc.AddPrimeAsync(dto));
}

// ── Congés ────────────────────────────────────────────────────────────────────
[ApiController]
[Route("api/conges")]
[Authorize]
public class CongesController(RHService svc) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString());

    [HttpPost]
    public async Task<IActionResult> Soumettre([FromBody] DemandeCongeDto dto)
    {
        // Pour simplifier : l'employeId vient du claim userId mappé à l'employé
        // En prod, retrouver l'employé via UserId
        var employeId = UserId; // TODO: mapper UserId → EmployeId
        return Ok(await svc.SoumettreCongeAsync(employeId, dto));
    }

    [HttpGet("mes-demandes")]
    public async Task<IActionResult> MesDemandes()
        => Ok(await svc.GetMesDemandesAsync(UserId));

    [HttpGet("a-approuver")]
    [Authorize(Roles = "Admin,RH")]
    public async Task<IActionResult> AApprouver()
        => Ok(await svc.GetAApprouverAsync());

    [HttpPatch("{id:guid}/approuver")]
    [Authorize(Roles = "Admin,RH")]
    public async Task<IActionResult> Approuver(Guid id, [FromBody] DecisionCongeDto dto)
        => Ok(await svc.ApprouverAsync(id, UserId, dto.Commentaire));

    [HttpPatch("{id:guid}/refuser")]
    [Authorize(Roles = "Admin,RH")]
    public async Task<IActionResult> Refuser(Guid id, [FromBody] DecisionCongeDto dto)
        => Ok(await svc.RefuserAsync(id, UserId, dto.Commentaire ?? "Refusé"));

    [HttpGet("solde/{employeId:guid}")]
    public async Task<IActionResult> GetSolde(Guid employeId)
        => Ok(await svc.GetSoldeCongeAsync(employeId));
}
