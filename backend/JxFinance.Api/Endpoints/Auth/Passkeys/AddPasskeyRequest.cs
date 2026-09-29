using System.Globalization;
using System.Text;
using JxFinance.Common;

namespace JxFinance.Endpoints.Auth.Passkeys;

public sealed record AddPasskeyRequest(string CredentialJson, string Name)
{
    private bool PrintMembers(StringBuilder builder)
    {
        builder.Append(CultureInfo.InvariantCulture, $"CredentialJson = {SecretText.Hidden}, Name = {Name}");
        return true;
    }
}
