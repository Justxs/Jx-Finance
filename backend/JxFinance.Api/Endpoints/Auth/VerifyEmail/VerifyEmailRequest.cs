namespace JxFinance.Endpoints.Auth.VerifyEmail;

public sealed record VerifyEmailRequest(string Email, string Token);
