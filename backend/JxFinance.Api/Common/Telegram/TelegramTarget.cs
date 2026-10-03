using System.Globalization;
using System.Text;

namespace JxFinance.Common.Telegram;

public sealed record TelegramTarget(string Token, long ChatId)
{
    private bool PrintMembers(StringBuilder builder)
    {
        builder.Append(CultureInfo.InvariantCulture, $"Token = {SecretText.Hidden}, ChatId = {ChatId}");
        return true;
    }
}
