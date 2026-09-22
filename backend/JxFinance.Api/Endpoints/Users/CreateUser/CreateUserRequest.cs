using System.Globalization;
using System.Text;
using JxFinance.Common;

namespace JxFinance.Endpoints.Users.CreateUser;

public sealed record CreateUserRequest(string Email, string DisplayName, string Role, string Password)
{
    private bool PrintMembers(StringBuilder builder)
    {
        builder.Append(CultureInfo.InvariantCulture, $"Email = {Email}, DisplayName = {DisplayName}, Role = {Role}, Password = {SecretText.Hidden}");
        return true;
    }
}
