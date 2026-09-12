namespace JxFinance.Endpoints.Auth.Shared;

public sealed record TwoFactorSetupResponse(string SharedKey, string AuthenticatorUri);
