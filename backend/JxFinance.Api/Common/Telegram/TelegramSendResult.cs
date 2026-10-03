using JxFinance.Domain.Common;

namespace JxFinance.Common.Telegram;

public sealed record TelegramSendResult(DomainError? Error, TimeSpan? RetryAfter = null, long? MigrateToChatId = null)
{
    public static TelegramSendResult Success { get; } = new((DomainError?)null);

    public bool IsSuccess => Error is null;

    public static TelegramSendResult Failure(string code, string message, TimeSpan? retryAfter = null) =>
        new(new DomainError(code, message), retryAfter);
}
