using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using Microsoft.AspNetCore.DataProtection;

namespace JxFinance.Common.Telegram;

public static class TelegramTokenSecret
{
    public const string ProtectorPurpose = "JxFinance.Telegram.BotToken";

    public static string Protect(IDataProtectionProvider protection, string token) =>
        protection.Protect(ProtectorPurpose, token.Trim());

    public static Result<string> Read(IDataProtectionProvider protection, string protectedToken)
    {
        if (protection.TryUnprotect(ProtectorPurpose, protectedToken) is not { } text)
        {
            return new DomainError(
                ErrorCodes.TelegramTokenUnreadable,
                "The stored Telegram bot token can no longer be read. Paste the token again.");
        }

        return TelegramBotToken.TryParse(text, out var token)
            ? token
            : new DomainError(ErrorCodes.TelegramInvalidToken, "The stored Telegram bot token is not valid. Paste it again.");
    }
}
