using System.Globalization;
using System.Text;
using JxFinance.Common;

namespace JxFinance.Endpoints.Auth.Tokens;

public sealed record CreatePersonalApiTokenRequest(string Name, int ExpiresInDays, string Password)
{
    private bool PrintMembers(StringBuilder builder)
    {
        builder.Append(CultureInfo.InvariantCulture, $"Name = {Name}, ExpiresInDays = {ExpiresInDays}, Password = {SecretText.Hidden}");
        return true;
    }
}
