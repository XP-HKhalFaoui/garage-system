using GarageSystem.Api.DTOs.Auth;
using GarageSystem.Infrastructure.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GarageSystem.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly UserManager<AppUser> _users;
    private readonly RoleManager<AppRole> _roles;

    public AdminController(UserManager<AppUser> users, RoleManager<AppRole> roles)
    {
        _users = users;
        _roles = roles;
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _users.Users.ToListAsync();

        var result = new List<UserDto>();
        foreach (var u in users)
        {
            var roles = await _users.GetRolesAsync(u);
            result.Add(new UserDto(u.Id, u.Email!, u.Nom, roles.FirstOrDefault() ?? "", u.IsActif));
        }

        return Ok(result.OrderBy(u => u.Email));
    }

    [HttpPost("users")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest req)
    {
        if (!await _roles.RoleExistsAsync(req.Role))
            return BadRequest(new { message = $"Rôle '{req.Role}' invalide." });

        var user = new AppUser
        {
            UserName = req.Email,
            Email    = req.Email,
            Nom      = req.Nom,
            IsActif  = true,
        };

        var result = await _users.CreateAsync(user, req.Password);
        if (!result.Succeeded)
            return BadRequest(new { message = string.Join(", ", result.Errors.Select(e => e.Description)) });

        await _users.AddToRoleAsync(user, req.Role);

        var roles = await _users.GetRolesAsync(user);
        return CreatedAtAction(nameof(GetUsers), new UserDto(user.Id, user.Email!, req.Nom, roles.FirstOrDefault() ?? "", user.IsActif));
    }

    [HttpPatch("users/{id}/role")]
    public async Task<IActionResult> ChangeRole(Guid id, [FromBody] ChangeRoleRequest req)
    {
        var user = await _users.FindByIdAsync(id.ToString());
        if (user is null) return NotFound();

        if (!await _roles.RoleExistsAsync(req.Role))
            return BadRequest(new { message = $"Rôle '{req.Role}' invalide." });

        var current = await _users.GetRolesAsync(user);
        await _users.RemoveFromRolesAsync(user, current);
        await _users.AddToRoleAsync(user, req.Role);

        return NoContent();
    }

    [HttpPatch("users/{id}/toggle")]
    public async Task<IActionResult> ToggleActif(Guid id)
    {
        var user = await _users.FindByIdAsync(id.ToString());
        if (user is null) return NotFound();

        user.IsActif = !user.IsActif;
        await _users.UpdateAsync(user);

        return Ok(new { isActif = user.IsActif });
    }

    [HttpGet("roles")]
    public IActionResult GetRoles()
    {
        var roles = _roles.Roles.Select(r => r.Name!).OrderBy(r => r).ToList();
        return Ok(roles);
    }
}
