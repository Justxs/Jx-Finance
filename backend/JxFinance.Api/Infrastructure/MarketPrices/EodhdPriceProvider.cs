using System.Globalization;
using System.Net;
using System.Text.Json;
using JxFinance.Common.Formats;
using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;

namespace JxFinance.Infrastructure.MarketPrices;

public sealed class EodhdPriceProvider(HttpClient http, EodhdQuoteCurrencies currencies) : IMarketPriceProvider
{
    public const string HostName = "eodhd.com";
    public const string TokenParameter = "api_token";

    private const string Name = "EODHD";

    public PriceSource Source => PriceSource.Eodhd;

    public int CallsFor(Security security) =>
        security.PriceQuoteCurrency is not null || currencies.TryGet(security.PriceSymbol!, out _) ? 1 : 2;

    public async Task<Result<IReadOnlyList<MarketClose>>> CloseAsync(
        Security security,
        DateOnly from,
        DateOnly to,
        string? apiKey,
        CancellationToken cancellationToken)
    {
        if (apiKey is null)
        {
            return Result<IReadOnlyList<MarketClose>>.Failure(MarketPriceErrors.KeyRequired);
        }

        try
        {
            var symbol = security.PriceSymbol!;
            var currency = await CurrencyAsync(security, apiKey, cancellationToken);
            if (currency.IsFailure)
            {
                return Result<IReadOnlyList<MarketClose>>.Failure(currency.Error);
            }

            var rows = await GetAsync<List<EodRow>>(
                string.Create(
                    CultureInfo.InvariantCulture,
                    $"api/eod/{Uri.EscapeDataString(symbol)}?from={from:yyyy-MM-dd}&to={to:yyyy-MM-dd}&fmt=json&{TokenParameter}={Uri.EscapeDataString(apiKey)}"),
                cancellationToken);
            if (rows.IsFailure)
            {
                return Result<IReadOnlyList<MarketClose>>.Failure(rows.Error);
            }

            var closes = new List<MarketClose>();
            foreach (var row in rows.Value ?? [])
            {
                if (row.Close is { } close
                    && close > 0m
                    && DateOnly.TryParseExact(row.Date, DateFormats.IsoDate, CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
                {
                    closes.Add(new MarketClose(date, close, currency.Value!));
                }
            }

            return Result<IReadOnlyList<MarketClose>>.Success(closes);
        }
        catch (Exception ex) when (IsUnreachable(ex, cancellationToken))
        {
            return Result<IReadOnlyList<MarketClose>>.Failure(MarketPriceErrors.Unavailable(Name));
        }
    }

    public async Task<Result<IReadOnlyList<PriceSymbolCandidate>>> FindAsync(
        string isin,
        string? apiKey,
        CancellationToken cancellationToken)
    {
        if (apiKey is null)
        {
            return Result<IReadOnlyList<PriceSymbolCandidate>>.Failure(MarketPriceErrors.KeyRequired);
        }

        try
        {
            var found = await SearchAsync(isin, null, apiKey, cancellationToken);
            if (found.IsFailure)
            {
                return Result<IReadOnlyList<PriceSymbolCandidate>>.Failure(found.Error);
            }

            var candidates = found.Value!
                .Where(item => item is { Code.Length: > 0, Exchange.Length: > 0, Currency.Length: Security.PriceQuoteCurrencyLength })
                .Select(item => new PriceSymbolCandidate($"{item.Code}.{item.Exchange}", item.Exchange!, item.Name ?? item.Code!, item.Currency!.ToUpperInvariant()))
                .ToList();
            foreach (var candidate in candidates)
            {
                currencies.Remember(candidate.Symbol, candidate.Currency);
            }

            return Result<IReadOnlyList<PriceSymbolCandidate>>.Success(candidates);
        }
        catch (Exception ex) when (IsUnreachable(ex, cancellationToken))
        {
            return Result<IReadOnlyList<PriceSymbolCandidate>>.Failure(MarketPriceErrors.Unavailable(Name));
        }
    }

    private async Task<Result<string>> CurrencyAsync(Security security, string apiKey, CancellationToken cancellationToken)
    {
        if (security.PriceQuoteCurrency is { } stored)
        {
            return stored;
        }

        var symbol = security.PriceSymbol!;
        if (currencies.TryGet(symbol, out var known))
        {
            return security.PriceQuoteCurrency = known;
        }

        var dot = symbol.LastIndexOf('.');
        if (dot <= 0 || dot == symbol.Length - 1)
        {
            return MarketPriceErrors.Rejected(Name, $"{symbol} is not a symbol of the form CODE.EXCHANGE, such as VWCE.XETRA.");
        }

        var (code, exchange) = (symbol[..dot], symbol[(dot + 1)..]);
        var found = await SearchAsync(code, exchange, apiKey, cancellationToken);
        if (found.IsFailure)
        {
            return found.Error;
        }

        var match = found.Value!.FirstOrDefault(item =>
            string.Equals(item.Code, code, StringComparison.OrdinalIgnoreCase)
            && string.Equals(item.Exchange, exchange, StringComparison.OrdinalIgnoreCase)
            && item.Currency is { Length: Security.PriceQuoteCurrencyLength });
        if (match is null)
        {
            return MarketPriceErrors.Rejected(Name, $"it does not list {symbol}.");
        }

        return security.PriceQuoteCurrency = match.Currency!.ToUpperInvariant();
    }

    private async Task<Result<List<SearchItem>>> SearchAsync(
        string query,
        string? exchange,
        string apiKey,
        CancellationToken cancellationToken)
    {
        var filter = exchange is null ? "" : $"&exchange={Uri.EscapeDataString(exchange)}";
        var found = await GetAsync<List<SearchItem>>(
            $"api/search/{Uri.EscapeDataString(query)}?fmt=json{filter}&{TokenParameter}={Uri.EscapeDataString(apiKey)}",
            cancellationToken);
        if (found.IsFailure)
        {
            return found.Error;
        }

        return found.Value ?? [];
    }

    private async Task<Result<T?>> GetAsync<T>(string path, CancellationToken cancellationToken)
    {
        using var response = await http.GetAsync(path, cancellationToken);
        if ((int)response.StatusCode >= 500)
        {
            return MarketPriceErrors.Unavailable(Name);
        }

        if (response.StatusCode != HttpStatusCode.OK)
        {
            return MarketPriceErrors.Rejected(Name, await response.Content.ReadAsStringAsync(cancellationToken));
        }

        return await response.Content.ReadFromJsonAsync<T>(cancellationToken);
    }

    private static bool IsUnreachable(Exception ex, CancellationToken cancellationToken) =>
        ex is HttpRequestException or JsonException
        || (ex is TaskCanceledException && !cancellationToken.IsCancellationRequested);

    private sealed record EodRow(string? Date, decimal? Close);

    private sealed record SearchItem(string? Code, string? Exchange, string? Name, string? Currency);
}
