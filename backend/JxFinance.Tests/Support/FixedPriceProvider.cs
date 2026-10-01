using System.Collections.Concurrent;
using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;
using JxFinance.Infrastructure.MarketPrices;

namespace JxFinance.Tests.Support;

public sealed class FixedPriceProvider(PriceSource source) : IMarketPriceProvider
{
    public const decimal DefaultClose = 100m;

    private readonly ConcurrentDictionary<string, string> currencies = new(StringComparer.OrdinalIgnoreCase);
    private readonly ConcurrentQueue<(string Symbol, DateOnly From, DateOnly To)> calls = new();

    public PriceSource Source => source;

    public IReadOnlyList<(string Symbol, DateOnly From, DateOnly To)> Calls => [.. calls];

    public void QuoteIn(string symbol, string currency) => currencies[symbol] = currency;

    public int CallsFor(Security security) => source switch
    {
        PriceSource.Kraken => 0,
        _ => security.PriceQuoteCurrency is null ? 2 : 1,
    };

    public Task<Result<IReadOnlyList<MarketClose>>> CloseAsync(
        Security security,
        DateOnly from,
        DateOnly to,
        string? apiKey,
        CancellationToken cancellationToken)
    {
        var symbol = security.PriceSymbol!;
        calls.Enqueue((symbol, from, to));
        var currency = security.PriceQuoteCurrency ?? currencies.GetValueOrDefault(symbol, "EUR");
        if (source == PriceSource.Eodhd)
        {
            security.PriceQuoteCurrency = currency;
        }

        var closes = new List<MarketClose>();
        for (var day = from; day <= to; day = day.AddDays(1))
        {
            if (source == PriceSource.Kraken || day.DayOfWeek is not (DayOfWeek.Saturday or DayOfWeek.Sunday))
            {
                closes.Add(new MarketClose(day, DefaultClose, currency));
            }
        }

        return Task.FromResult(Result<IReadOnlyList<MarketClose>>.Success(closes));
    }

    public Task<Result<IReadOnlyList<PriceSymbolCandidate>>> FindAsync(
        string isin,
        string? apiKey,
        CancellationToken cancellationToken) =>
        Task.FromResult(Result<IReadOnlyList<PriceSymbolCandidate>>.Success(
            [new PriceSymbolCandidate("VWCE.XETRA", "XETRA", "Vanguard FTSE All-World UCITS ETF", "EUR")]));
}
