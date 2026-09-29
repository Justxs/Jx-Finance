namespace JxFinance.Domain.Common;

public static class OutboxQueries
{
    public static IQueryable<T> Due<T>(this IQueryable<T> messages, DateTimeOffset now)
        where T : OutboxMessage =>
        messages.Where(m => m.SentAt == null && m.Attempts < OutboxMessage.MaxAttempts && m.NextAttemptAt <= now);
}
