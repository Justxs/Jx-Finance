using JxFinance.Common;

namespace JxFinance.Endpoints.Auth.Shared;

public sealed record ReauthenticateRequest(string Password)
{
    public override string ToString() => $"{nameof(ReauthenticateRequest)} {{ Password = {SecretText.Hidden} }}";
}
