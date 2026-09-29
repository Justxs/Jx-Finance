using System.Globalization;
using System.Text;
using JxFinance.Common;

namespace JxFinance.Endpoints.Auth.Tokens;

public sealed record CreatedPersonalApiTokenResponse(
    Guid Id,
    string Name,
    string Prefix,
    DateTimeOffset CreatedAt,
    DateTimeOffset ExpiresAt,
    string Token)
{
    private bool PrintMembers(StringBuilder builder)
    {
        builder.Append(
            CultureInfo.InvariantCulture,
            $"Id = {Id}, Name = {Name}, Prefix = {Prefix}, CreatedAt = {CreatedAt}, ExpiresAt = {ExpiresAt}, Token = {SecretText.Hidden}");
        return true;
    }
}
