using System.Globalization;
using System.Text;
using JxFinance.Common;

namespace JxFinance.Endpoints.Settings.UpdateDiscordSettings;

public sealed record UpdateDiscordSettingsRequest(bool Enabled, string? WebhookUrl)
{
    private bool PrintMembers(StringBuilder builder)
    {
        builder.Append(CultureInfo.InvariantCulture, $"Enabled = {Enabled}, WebhookUrl = {SecretText.Hidden}");
        return true;
    }
}
