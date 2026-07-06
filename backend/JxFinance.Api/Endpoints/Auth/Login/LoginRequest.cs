namespace JxFinance.Endpoints.Auth.Login;

public sealed record LoginRequest(string Email, string Password, bool RememberMe, string? TwoFactorCode);
