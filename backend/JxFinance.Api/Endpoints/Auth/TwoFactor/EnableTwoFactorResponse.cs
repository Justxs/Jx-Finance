namespace JxFinance.Endpoints.Auth.TwoFactor;

public sealed record EnableTwoFactorResponse(IReadOnlyList<string> RecoveryCodes);
