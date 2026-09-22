using System.Globalization;
using System.Net;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.Formats;
using JxFinance.Domain.Common;
using JxFinance.Domain.ExchangeRates;

namespace JxFinance.Infrastructure.ExchangeRates;

public sealed class FrankfurterRateProvider(HttpClient http) : IExchangeRateProvider
{
    public async Task<IReadOnlyList<ExchangeRate>> GetAsync(DateOnly from, DateOnly to, CancellationToken cancellationToken)
    {
        var range = string.Create(CultureInfo.InvariantCulture, $"{from:yyyy-MM-dd}..{to:yyyy-MM-dd}?base=EUR");
        using var response = await http.GetAsync(range, cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return [];
        }

        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<RangeResponse>(cancellationToken);
        if (body?.Rates is null)
        {
            return [];
        }

        var rates = new List<ExchangeRate>();
        foreach (var (day, quotes) in body.Rates)
        {
            if (!DateOnly.TryParseExact(day, DateFormats.IsoDate, CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
            {
                continue;
            }

            foreach (var (code, rate) in quotes)
            {
                if (rate > 0 && CurrencyCode.TryParse(code, out var currency) && currency != Currency.Eur)
                {
                    rates.Add(new ExchangeRate { Date = date, Currency = currency, Rate = rate });
                }
            }
        }

        return rates;
    }

    private sealed record RangeResponse(Dictionary<string, Dictionary<string, decimal>>? Rates);
}
