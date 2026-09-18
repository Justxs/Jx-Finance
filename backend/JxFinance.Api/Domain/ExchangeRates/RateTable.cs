using JxFinance.Domain.Common;

namespace JxFinance.Domain.ExchangeRates;

public sealed class RateTable(DateOnly? asOf, IReadOnlyDictionary<Currency, decimal> perEuro)
{
    public static RateTable Empty { get; } = new(null, new Dictionary<Currency, decimal>());

    public DateOnly? AsOf { get; } = asOf;

    public decimal? Rate(Currency from, Currency to)
    {
        if (from == to)
        {
            return 1m;
        }

        var fromPerEuro = PerEuro(from);
        var toPerEuro = PerEuro(to);
        if (fromPerEuro is null || toPerEuro is null)
        {
            return null;
        }

        return toPerEuro.Value / fromPerEuro.Value;
    }

    public decimal? Convert(decimal amount, Currency from, Currency to) =>
        Rate(from, to) is { } rate ? Money.Round(amount * rate) : null;

    private decimal? PerEuro(Currency currency)
    {
        if (currency == Currency.Eur)
        {
            return 1m;
        }

        return perEuro.TryGetValue(currency, out var rate) && rate > 0 ? rate : null;
    }
}
