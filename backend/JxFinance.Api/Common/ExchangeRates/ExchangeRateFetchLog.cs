using System.Collections.Concurrent;
using FastEndpoints;

namespace JxFinance.Common.ExchangeRates;

[RegisterService<ExchangeRateFetchLog>(LifeTime.Singleton)]
public sealed class ExchangeRateFetchLog
{
    private static readonly TimeSpan RetryAfter = TimeSpan.FromMinutes(15);

    private readonly ConcurrentDictionary<DateOnly, DateTimeOffset> attempts = new();

    public bool ShouldFetch(DateOnly date, DateTimeOffset now) =>
        !attempts.TryGetValue(date, out var last) || now - last > RetryAfter;

    public void Record(DateOnly date, DateTimeOffset now) => attempts[date] = now;
}
