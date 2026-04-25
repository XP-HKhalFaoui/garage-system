using GarageSystem.Domain.Common;

namespace GarageSystem.Infrastructure.Identity;

public class RefreshToken : BaseEntity
{
    public string Token { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public DateTime Expiration { get; set; }
    public bool IsRevoked { get; set; }
    public string? ReplacedByToken { get; set; }
}
