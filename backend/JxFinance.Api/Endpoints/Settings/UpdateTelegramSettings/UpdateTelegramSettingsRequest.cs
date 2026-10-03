using System.Globalization;
using System.Text;
using JxFinance.Common;

namespace JxFinance.Endpoints.Settings.UpdateTelegramSettings;

public sealed record UpdateTelegramSettingsRequest(bool Enabled, string? BotToken, long? ChatId)
{
    private bool PrintMembers(StringBuilder builder)
    {
        builder.Append(CultureInfo.InvariantCulture, $"Enabled = {Enabled}, BotToken = {SecretText.Hidden}, ChatId = {ChatId}");
        return true;
    }
}
