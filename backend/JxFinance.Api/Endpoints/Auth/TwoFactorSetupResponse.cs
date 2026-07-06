namespace JxFinance.Endpoints.Auth;

public sealed record TwoFactorSetupResponse(string SharedKey, string AuthenticatorUri);
