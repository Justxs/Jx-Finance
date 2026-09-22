using JxFinance.Common;

namespace JxFinance.Endpoints.Auth.Shared;

public sealed record TwoFactorSetupResponse(string SharedKey, string AuthenticatorUri)
{
    public override string ToString() =>
        $"{nameof(TwoFactorSetupResponse)} {{ SharedKey = {SecretText.Hidden}, AuthenticatorUri = {SecretText.Hidden} }}";
}
