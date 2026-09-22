using System.Globalization;
using System.Text;
using JxFinance.Common;

namespace JxFinance.Endpoints.Users.ResetUserPassword;

public sealed record ResetUserPasswordRequest(Guid Id, string NewPassword, string CurrentPassword, bool ResetTwoFactor = false)
{
    private bool PrintMembers(StringBuilder builder)
    {
        builder.Append(
            CultureInfo.InvariantCulture,
            $"Id = {Id}, NewPassword = {SecretText.Hidden}, CurrentPassword = {SecretText.Hidden}, "
            + $"ResetTwoFactor = {ResetTwoFactor}");
        return true;
    }
}
