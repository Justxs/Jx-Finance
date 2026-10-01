using JxFinance.Domain.Common;

namespace JxFinance.Domain.ExchangeRates;

public sealed class RateHistory
{
    private readonly List<RateTable> tables = [];

    public RateHistory(IEnumerable<ExchangeRate> synced, IEnumerable<ManualExchangeRate> manual)
    {
        var quotes = synced.Select(r => (r.Date, r.Currency, r.Rate, Manual: false))
            .Concat(manual.Select(r => (r.Date, r.Currency, r.Rate, Manual: true)))
            .GroupBy(q => q.Date)
            .OrderBy(g => g.Key);

        var newest = new Dictionary<Currency, (DateOnly Date, decimal Rate)>();
        DateOnly? syncedAsOf = null;
        foreach (var day in quotes)
        {
            foreach (var quote in day.OrderBy(q => q.Manual))
            {
                newest[quote.Currency] = (day.Key, quote.Rate);
            }

            if (day.Any(q => !q.Manual))
            {
                syncedAsOf = day.Key;
            }

            var oldest = day.Key.AddDays(-RateTable.MaxGapDays);
            var current = newest.Where(p => p.Value.Date >= oldest).ToDictionary(p => p.Key, p => p.Value.Rate);
            tables.Add(new RateTable(day.Key, current) { SyncedAsOf = syncedAsOf });
        }
    }

    public RateTable OnOrBefore(DateOnly date)
    {
        var (low, high) = (0, tables.Count - 1);
        var found = RateTable.Empty;
        while (low <= high)
        {
            var middle = (low + high) / 2;
            if (tables[middle].AsOf <= date)
            {
                found = tables[middle];
                low = middle + 1;
            }
            else
            {
                high = middle - 1;
            }
        }

        return found;
    }
}
