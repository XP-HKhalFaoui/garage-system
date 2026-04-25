using GarageSystem.Api.DTOs.Auth;
using GarageSystem.Domain.Exceptions;
using GarageSystem.Infrastructure.Identity;
using GarageSystem.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GarageSystem.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<AppUser> _userManager;
    private readonly IJwtService _jwtService;
    private readonly ApplicationDbContext _db;

    public AuthController(UserManager<AppUser> um, IJwtService jwt, ApplicationDbContext db)
    {
        _userManager = um;
        _jwtService = jwt;
        _db = db;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var user = await _userManager.FindByEmailAsync(req.Email);
        if (user is null || !await _userManager.CheckPasswordAsync(user, req.Password))
            return Unauthorized(new { message = "Identifiants incorrects" });

        if (!user.IsActif)
            return Unauthorized(new { message = "Compte désactivé" });

        var roles = await _userManager.GetRolesAsync(user);
        var accessToken = _jwtService.GenerateAccessToken(user, roles);
        var refreshToken = _jwtService.GenerateRefreshToken();

        _db.RefreshTokens.Add(new RefreshToken
        {
            Token = refreshToken,
            UserId = user.Id,
            Expiration = DateTime.UtcNow.AddDays(7)
        });
        await _db.SaveChangesAsync();

        return Ok(new { accessToken, expiresIn = 900, refreshToken });
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest req)
    {
        var stored = await _db.RefreshTokens
            .FirstOrDefaultAsync(t => t.Token == req.RefreshToken && !t.IsRevoked);

        if (stored is null || stored.Expiration < DateTime.UtcNow)
            return Unauthorized(new { message = "Refresh token invalide ou expiré" });

        var user = await _userManager.FindByIdAsync(stored.UserId.ToString());
        if (user is null) return Unauthorized();

        // Rotate
        stored.IsRevoked = true;
        var newRefresh = _jwtService.GenerateRefreshToken();
        stored.ReplacedByToken = newRefresh;
        _db.RefreshTokens.Add(new RefreshToken
        {
            Token = newRefresh,
            UserId = user.Id,
            Expiration = DateTime.UtcNow.AddDays(7)
        });
        await _db.SaveChangesAsync();

        var roles = await _userManager.GetRolesAsync(user);
        var accessToken = _jwtService.GenerateAccessToken(user, roles);

        return Ok(new { accessToken, expiresIn = 900, refreshToken = newRefresh });
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] LogoutRequest req)
    {
        var token = await _db.RefreshTokens
            .FirstOrDefaultAsync(t => t.Token == req.RefreshToken);
        if (token is not null) token.IsRevoked = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var user = await _userManager.FindByIdAsync(userId!);
        if (user is null) return NotFound();
        var roles = await _userManager.GetRolesAsync(user);
        return Ok(new { userId = user.Id, email = user.Email, roles });
    }
}
