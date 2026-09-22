using System.Globalization;
using System.Text;
using JxFinance.Common;

namespace JxFinance.Endpoints.Auth.ResetPassword;

public sealed record ResetPasswordRequest(string Email, string Token, string NewPassword)
{
    private bool PrintMembers(StringBuilder builder)
    {
        builder.Append(CultureInfo.InvariantCulture, $"Email = {Email}, Token = {SecretText.Hidden}, NewPassword = {SecretText.Hidden}");
        return true;
    }
}
