using System.Globalization;
using System.Text;
using JxFinance.Common;

namespace JxFinance.Endpoints.Auth.Setup;

public sealed record SetupRequest(string Email, string Password, string DisplayName)
{
    private bool PrintMembers(StringBuilder builder)
    {
        builder.Append(CultureInfo.InvariantCulture, $"Email = {Email}, Password = {SecretText.Hidden}, DisplayName = {DisplayName}");
        return true;
    }
}
