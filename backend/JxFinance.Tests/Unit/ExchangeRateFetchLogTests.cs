using JxFinance.Common.ExchangeRates;

namespace JxFinance.Tests.Unit;

public sealed class ExchangeRateFetchLogTests
{
    private static readonly DateTimeOffset Now = new(2026, 9, 19, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Prune_removes_only_attempts_that_no_longer_block_a_fetch()
    {
        var log = new ExchangeRateFetchLog();
        for (var day = 1; day <= 20; day++)
        {
            log.Record(new DateOnly(2026, 8, day), Now.AddHours(-day));
        }

        var recent = new DateOnly(2026, 9, 19);
        log.Record(recent, Now.AddMinutes(-5));

        var removed = log.Prune(Now);

        Assert.Equal(20, removed);
        Assert.Equal(1, log.Count);
        Assert.False(log.ShouldFetch(recent, Now));
        Assert.True(log.ShouldFetch(new DateOnly(2026, 8, 1), Now));
    }

    [Fact]
    public void Prune_keeps_an_attempt_until_its_retry_window_has_passed()
    {
        var log = new ExchangeRateFetchLog();
        var date = new DateOnly(2026, 9, 18);
        log.Record(date, Now);

        Assert.Equal(0, log.Prune(Now.AddMinutes(15)));
        Assert.False(log.ShouldFetch(date, Now.AddMinutes(15)));
        Assert.Equal(1, log.Prune(Now.AddMinutes(16)));
        Assert.Equal(0, log.Count);
    }
}
