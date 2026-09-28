using System.Globalization;
using System.Text;
using JxFinance.Common;

namespace JxFinance.Endpoints.Users.UpdateMyProfile;

public sealed record UpdateMyProfileRequest(
    string DisplayName,
    string? CurrentPassword,
    string? NewPassword)
{
    private bool PrintMembers(StringBuilder builder)
    {
        builder.Append(
            CultureInfo.InvariantCulture,
            $"DisplayName = {DisplayName}, CurrentPassword = {SecretText.Hidden}, NewPassword = {SecretText.Hidden}");
        return true;
    }
}
