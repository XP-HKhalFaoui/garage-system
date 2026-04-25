using Microsoft.AspNetCore.Identity;

namespace GarageSystem.Infrastructure.Identity;

public class AppRole : IdentityRole<Guid>
{
    public AppRole() { }
    public AppRole(string roleName) : base(roleName) { }
}
