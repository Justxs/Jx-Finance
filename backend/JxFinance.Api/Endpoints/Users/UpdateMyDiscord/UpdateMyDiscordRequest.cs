using System.Globalization;
using System.Text;
using JxFinance.Common;
using JxFinance.Domain.Notifications;

namespace JxFinance.Endpoints.Users.UpdateMyDiscord;

public sealed record UpdateMyDiscordRequest(
    string? WebhookUrl,
    bool IsEnabled,
    IReadOnlyList<NotificationType> Types)
{
    private bool PrintMembers(StringBuilder builder)
    {
        builder.Append(
            CultureInfo.InvariantCulture,
            $"WebhookUrl = {SecretText.Hidden}, IsEnabled = {IsEnabled}, Types = [{string.Join(", ", Types ?? [])}]");
        return true;
    }
}
