using System.Globalization;
using System.Text;
using JxFinance.Common;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Auth.Tokens;

public sealed record CreatePersonalApiTokenRequest(string Name, int ExpiresInDays, string Password, TokenAccess Access)
{
    private bool PrintMembers(StringBuilder builder)
    {
        builder.Append(CultureInfo.InvariantCulture, $"Name = {Name}, ExpiresInDays = {ExpiresInDays}, Password = {SecretText.Hidden}, Access = {Access}");
        return true;
    }
}
