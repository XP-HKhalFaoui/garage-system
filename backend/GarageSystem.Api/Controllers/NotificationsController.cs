using GarageSystem.Domain.Entities;
using GarageSystem.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace GarageSystem.Api.Controllers;

public record SubscribeDto(string Endpoint, string P256dh, string Auth, string? UserAgent);

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IConfiguration _config;

    public NotificationsController(ApplicationDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    // GET /api/notifications/vapid-public-key
    [HttpGet("vapid-public-key")]
    public IActionResult GetVapidKey()
        => Ok(new { publicKey = _config["Vapid:PublicKey"] });

    // POST /api/notifications/subscribe
    [HttpPost("subscribe")]
    public async Task<IActionResult> Subscribe([FromBody] SubscribeDto dto)
    {
        var exists = await _db.PushSubscriptions
            .AnyAsync(s => s.Endpoint == dto.Endpoint && s.UserId == UserId);

        if (!exists)
        {
            _db.PushSubscriptions.Add(new PushSubscriptionEntity
            {
                Id = Guid.NewGuid(),
                UserId = UserId,
                Endpoint = dto.Endpoint,
                P256dh = dto.P256dh,
                Auth = dto.Auth,
                UserAgent = dto.UserAgent,
                DateCreation = DateTime.UtcNow,
            });
            await _db.SaveChangesAsync();
        }

        return NoContent();
    }

    // DELETE /api/notifications/unsubscribe
    [HttpDelete("unsubscribe")]
    public async Task<IActionResult> Unsubscribe([FromBody] SubscribeDto dto)
    {
        var sub = await _db.PushSubscriptions
            .FirstOrDefaultAsync(s => s.Endpoint == dto.Endpoint && s.UserId == UserId);

        if (sub != null)
        {
            _db.PushSubscriptions.Remove(sub);
            await _db.SaveChangesAsync();
        }

        return NoContent();
    }
}
