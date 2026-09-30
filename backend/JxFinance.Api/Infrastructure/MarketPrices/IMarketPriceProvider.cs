using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;

namespace JxFinance.Infrastructure.MarketPrices;

public interface IMarketPriceProvider
{
    PriceSource Source { get; }

    int CallsFor(string symbol);

    Task<Result<IReadOnlyList<MarketClose>>> CloseAsync(
        string symbol,
        DateOnly from,
        DateOnly to,
        string? apiKey,
        CancellationToken cancellationToken);

    Task<Result<IReadOnlyList<PriceSymbolCandidate>>> FindAsync(
        string isin,
        string? apiKey,
        CancellationToken cancellationToken);
}
