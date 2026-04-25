using Microsoft.AspNetCore.Identity;

namespace GarageSystem.Infrastructure.Identity;

public class AppUser : IdentityUser<Guid>
{
    public Guid? EmployeId { get; set; }
    public bool IsActif { get; set; } = true;
}
