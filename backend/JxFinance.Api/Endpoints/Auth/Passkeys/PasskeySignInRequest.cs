using System.Globalization;
using System.Text;
using JxFinance.Common;

namespace JxFinance.Endpoints.Auth.Passkeys;

public sealed record PasskeySignInRequest(string CredentialJson, bool RememberMe)
{
    private bool PrintMembers(StringBuilder builder)
    {
        builder.Append(CultureInfo.InvariantCulture, $"CredentialJson = {SecretText.Hidden}, RememberMe = {RememberMe}");
        return true;
    }
}
