using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using Microsoft.AspNetCore.DataProtection;

namespace JxFinance.Common.Discord;

public static class DiscordWebhookSecret
{
    public const string ProtectorPurpose = "JxFinance.Discord.Webhook";

    public static string Protect(IDataProtectionProvider protection, string url) =>
        protection.Protect(ProtectorPurpose, url.Trim());

    public static Result<DiscordTarget> Read(IDataProtectionProvider protection, string protectedUrl)
    {
        if (protection.TryUnprotect(ProtectorPurpose, protectedUrl) is not { } url)
        {
            return new DomainError(
                ErrorCodes.DiscordWebhookUnreadable,
                "The stored Discord webhook can no longer be read. Paste the webhook URL again.");
        }

        return DiscordWebhookUrl.TryParse(url, out var target)
            ? target
            : new DomainError(ErrorCodes.DiscordInvalidWebhook, "The stored Discord webhook URL is not valid. Paste it again.");
    }
}
