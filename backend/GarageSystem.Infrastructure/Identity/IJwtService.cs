using GarageSystem.Infrastructure.Identity;

namespace GarageSystem.Infrastructure.Identity;

public interface IJwtService
{
    string GenerateAccessToken(AppUser user, IList<string> roles);
    string GenerateRefreshToken();
}
