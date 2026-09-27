using JxFinance.Domain.Common;

namespace JxFinance.Common.Discord;

public sealed record DiscordSendResult(DomainError? Error, TimeSpan? RetryAfter = null)
{
    public static DiscordSendResult Success { get; } = new((DomainError?)null);

    public bool IsSuccess => Error is null;

    public static DiscordSendResult Failure(string code, string message, TimeSpan? retryAfter = null) =>
        new(new DomainError(code, message), retryAfter);
}
