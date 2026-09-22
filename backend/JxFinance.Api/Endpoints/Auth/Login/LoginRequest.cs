using System.Globalization;
using System.Text;
using JxFinance.Common;

namespace JxFinance.Endpoints.Auth.Login;

public sealed record LoginRequest(string Email, string Password, bool RememberMe, string? TwoFactorCode)
{
    private bool PrintMembers(StringBuilder builder)
    {
        builder.Append(
            CultureInfo.InvariantCulture,
            $"Email = {Email}, Password = {SecretText.Hidden}, RememberMe = {RememberMe}, "
            + $"TwoFactorCode = {SecretText.Hidden}");
        return true;
    }
}
