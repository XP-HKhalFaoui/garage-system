namespace GarageSystem.Api.DTOs.Auth;

public record LoginRequest(string Email, string Password);
public record RefreshRequest(string RefreshToken);
public record LogoutRequest(string RefreshToken);
