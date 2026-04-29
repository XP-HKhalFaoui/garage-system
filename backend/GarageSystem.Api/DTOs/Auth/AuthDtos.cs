namespace GarageSystem.Api.DTOs.Auth;

public record LoginRequest(string Email, string Password);
public record RefreshRequest(string RefreshToken);
public record LogoutRequest(string RefreshToken);

// ── Admin user management ──────────────────────────────────────────────────────
public record UserDto(Guid Id, string Email, string Nom, string Role, bool IsActif);
public record CreateUserRequest(string Email, string Nom, string Password, string Role);
public record ChangeRoleRequest(string Role);

