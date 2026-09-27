using System.Globalization;
using System.Text;

namespace JxFinance.Common.Discord;

public sealed record DiscordTarget(string Id, string Token)
{
    private bool PrintMembers(StringBuilder builder)
    {
        builder.Append(CultureInfo.InvariantCulture, $"Id = {Id}, Token = {SecretText.Hidden}");
        return true;
    }
}
