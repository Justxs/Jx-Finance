using System.Globalization;
using System.Text;
using JxFinance.Common;

namespace JxFinance.Endpoints.Auth.VerifyEmail;

public sealed record VerifyEmailRequest(string Email, string Token)
{
    private bool PrintMembers(StringBuilder builder)
    {
        builder.Append(CultureInfo.InvariantCulture, $"Email = {Email}, Token = {SecretText.Hidden}");
        return true;
    }
}
