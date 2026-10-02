using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;
using JxFinance.Domain.Settings;
using JxFinance.Infrastructure.MarketPrices;

namespace JxFinance.Endpoints.Investments.Services;

public static class PriceSyncRules
{
    public static readonly TimeSpan FailureBackOff = TimeSpan.FromHours(24);

    private const string GreatBritishPence = "GBX";
    private const decimal PencePerPound = 100m;

    public static DateOnly Target(DateOnly today, PriceSource source)
    {
        var day = today.AddDays(-1);
        while (source != PriceSource.Kraken && day.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday)
        {
            day = day.AddDays(-1);
        }

        return day;
    }

    public static bool IsDue(Security security, IClock clock, bool force)
    {
        if (security.PriceSyncedAt is not { } attempted)
        {
            return true;
        }

        if (!force && security.PriceSyncError is not null && clock.UtcNow - attempted < FailureBackOff)
        {
            return false;
        }

        if (security.LastPriceDate is { } last && last >= Target(clock.Today, security.PriceSource))
        {
            return false;
        }

        return force || DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(attempted, clock.TimeZone).DateTime) < clock.Today;
    }

    public static DateOnly From(Security security, bool hasFeedPrice, DateOnly firstTrade) =>
        security is { PriceSyncedAt: not null, LastPriceDate: { } last } && hasFeedPrice ? last.AddDays(1) : firstTrade;

    public static int CallsLeft(InstanceSettings settings, DateOnly today, int limit) =>
        settings.PriceCallsDate == today ? Math.Max(0, limit - settings.PriceCallsUsed) : limit;

    public static void Spend(InstanceSettings settings, DateOnly today, int calls)
    {
        if (settings.PriceCallsDate != today)
        {
            settings.PriceCallsDate = today;
            settings.PriceCallsUsed = 0;
        }

        settings.PriceCallsUsed += calls;
    }

    public static Result<IReadOnlyList<MarketClose>> InSecurityCurrency(Security security, IReadOnlyList<MarketClose> closes)
    {
        var expected = security.Currency.ToCode();
        var converted = new List<MarketClose>(closes.Count);
        foreach (var close in closes)
        {
            var inPence = close.Currency.Equals(GreatBritishPence, StringComparison.OrdinalIgnoreCase) && security.Currency == Currency.Gbp;
            if (!inPence && !close.Currency.Equals(expected, StringComparison.OrdinalIgnoreCase))
            {
                return new DomainError(
                    ErrorCodes.RangeInvalid,
                    $"The source quotes {security.PriceSymbol} in {close.Currency.ToUpperInvariant()}, but the security is in {expected}. Check the price symbol.");
            }

            converted.Add(inPence ? close with { Close = close.Close / PencePerPound, Currency = expected } : close);
        }

        return Result<IReadOnlyList<MarketClose>>.Success(converted);
    }
}
