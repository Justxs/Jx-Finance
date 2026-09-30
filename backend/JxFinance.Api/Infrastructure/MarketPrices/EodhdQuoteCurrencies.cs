using System.Collections.Concurrent;

namespace JxFinance.Infrastructure.MarketPrices;

public sealed class EodhdQuoteCurrencies
{
    private readonly ConcurrentDictionary<string, string> known = new(StringComparer.OrdinalIgnoreCase);

    public bool TryGet(string symbol, out string currency) => known.TryGetValue(symbol, out currency!);

    public void Remember(string symbol, string currency) => known[symbol] = currency.ToUpperInvariant();
}
