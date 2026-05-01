using GarageSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using WebPush;

namespace GarageSystem.Api.Services;

public record PushPayload(string Title, string Body, string? Icon = null, string? Url = null, string? Tag = null);

public class PushNotificationService
{
    private readonly ApplicationDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<PushNotificationService> _logger;

    public PushNotificationService(
        ApplicationDbContext db,
        IConfiguration config,
        ILogger<PushNotificationService> logger)
    {
        _db = db;
        _config = config;
        _logger = logger;
    }

    public async Task SendToUserAsync(string userId, PushPayload payload)
    {
        var subs = await _db.PushSubscriptions
            .Where(s => s.UserId == userId)
            .ToListAsync();

        if (subs.Count == 0) return;

        var vapidSubject = _config["Vapid:Subject"] ?? "mailto:admin@garage.dz";
        var publicKey = _config["Vapid:PublicKey"]!;
        var privateKey = _config["Vapid:PrivateKey"]!;

        var vapidDetails = new VapidDetails(vapidSubject, publicKey, privateKey);
        var client = new WebPushClient();

        var json = System.Text.Json.JsonSerializer.Serialize(payload);

        var toRemove = new List<Guid>();
        var tasks = subs.Select(async sub =>
        {
            try
            {
                var pushSub = new PushSubscription(sub.Endpoint, sub.P256dh, sub.Auth);
                await client.SendNotificationAsync(pushSub, json, vapidDetails);
            }
            catch (WebPushException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Gone)
            {
                toRemove.Add(sub.Id);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Erreur push pour userId={UserId}", userId);
            }
        });

        await Task.WhenAll(tasks);

        if (toRemove.Count > 0)
        {
            _db.PushSubscriptions.RemoveRange(
                _db.PushSubscriptions.Where(s => toRemove.Contains(s.Id)));
            await _db.SaveChangesAsync();
        }
    }
}
