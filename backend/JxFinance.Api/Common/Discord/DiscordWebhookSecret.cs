using System.Security.Cryptography;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using Microsoft.AspNetCore.DataProtection;

namespace JxFinance.Common.Discord;

public static class DiscordWebhookSecret
{
    public const string ProtectorPurpose = "JxFinance.Discord.Webhook";

    public static string Protect(IDataProtectionProvider protection, string url) =>
        protection.CreateProtector(ProtectorPurpose).Protect(url.Trim());

    public static Result<DiscordTarget> Read(IDataProtectionProvider protection, string protectedUrl)
    {
        string url;
        try
        {
            url = protection.CreateProtector(ProtectorPurpose).Unprotect(protectedUrl);
        }
        catch (CryptographicException)
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
