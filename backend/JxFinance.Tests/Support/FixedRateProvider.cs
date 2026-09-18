using JxFinance.Common.ExchangeRates;
using JxFinance.Domain.Common;
using JxFinance.Domain.ExchangeRates;

namespace JxFinance.Tests.Support;

public sealed class FixedRateProvider : IExchangeRateProvider
{
    public const decimal UsdPerEuro = 1.10m;
    public const decimal GbpPerEuro = 0.80m;

    public Task<IReadOnlyList<ExchangeRate>> GetAsync(DateOnly from, DateOnly to, CancellationToken cancellationToken)
    {
        var rates = new List<ExchangeRate>();
        for (var date = from; date <= to; date = date.AddDays(1))
        {
            rates.Add(new ExchangeRate { Date = date, Currency = Currency.Usd, Rate = UsdPerEuro });
            rates.Add(new ExchangeRate { Date = date, Currency = Currency.Gbp, Rate = GbpPerEuro });
        }

        return Task.FromResult<IReadOnlyList<ExchangeRate>>(rates);
    }
}
