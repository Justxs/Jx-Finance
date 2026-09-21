namespace JxFinance.Domain.ExchangeRates;

public sealed class RateHistory(IEnumerable<ExchangeRate> rates)
{
    private readonly List<RateTable> tables = rates
        .GroupBy(r => r.Date)
        .OrderBy(g => g.Key)
        .Select(g => new RateTable(g.Key, g.ToDictionary(r => r.Currency, r => r.Rate)))
        .ToList();

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
