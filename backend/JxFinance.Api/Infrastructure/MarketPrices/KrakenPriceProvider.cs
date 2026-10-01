using System.Globalization;
using System.Text.Json;
using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;

namespace JxFinance.Infrastructure.MarketPrices;

public sealed class KrakenPriceProvider(HttpClient http) : IMarketPriceProvider
{
    private const string Name = "Kraken";
    private const int CloseIndex = 4;

    public PriceSource Source => PriceSource.Kraken;

    public int CallsFor(Security security) => 0;

    public async Task<Result<IReadOnlyList<MarketClose>>> CloseAsync(
        Security security,
        DateOnly from,
        DateOnly to,
        string? apiKey,
        CancellationToken cancellationToken)
    {
        var symbol = security.PriceSymbol!;
        var since = new DateTimeOffset(from.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero).ToUnixTimeSeconds() - 1;
        try
        {
            using var response = await http.GetAsync(
                string.Create(CultureInfo.InvariantCulture, $"0/public/OHLC?pair={Uri.EscapeDataString(symbol)}&interval=1440&since={since}"),
                cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return Result<IReadOnlyList<MarketClose>>.Failure(MarketPriceErrors.Unavailable(Name));
            }

            using var body = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
            return Parse(body.RootElement, symbol, from, to);
        }
        catch (Exception ex) when (ex is HttpRequestException or JsonException
            || (ex is TaskCanceledException && !cancellationToken.IsCancellationRequested))
        {
            return Result<IReadOnlyList<MarketClose>>.Failure(MarketPriceErrors.Unavailable(Name));
        }
    }

    public Task<Result<IReadOnlyList<PriceSymbolCandidate>>> FindAsync(
        string isin,
        string? apiKey,
        CancellationToken cancellationToken) =>
        Task.FromResult(Result<IReadOnlyList<PriceSymbolCandidate>>.Success([]));

    private static Result<IReadOnlyList<MarketClose>> Parse(JsonElement root, string symbol, DateOnly from, DateOnly to)
    {
        if (root.TryGetProperty("error", out var errors) && errors.ValueKind == JsonValueKind.Array && errors.GetArrayLength() > 0)
        {
            return Result<IReadOnlyList<MarketClose>>.Failure(
                MarketPriceErrors.Rejected(Name, string.Join("; ", errors.EnumerateArray().Select(e => e.ToString()))));
        }

        if (!root.TryGetProperty("result", out var result) || result.ValueKind != JsonValueKind.Object)
        {
            return Result<IReadOnlyList<MarketClose>>.Failure(MarketPriceErrors.Unavailable(Name));
        }

        var currency = symbol.Length > 3 ? symbol[^3..].ToUpperInvariant() : symbol.ToUpperInvariant();
        var closes = new List<MarketClose>();
        foreach (var pair in result.EnumerateObject().Where(p => p.Value.ValueKind == JsonValueKind.Array))
        {
            foreach (var candle in pair.Value.EnumerateArray())
            {
                if (candle.ValueKind != JsonValueKind.Array
                    || candle.GetArrayLength() <= CloseIndex
                    || candle[0].ValueKind != JsonValueKind.Number
                    || !candle[0].TryGetInt64(out var time)
                    || candle[CloseIndex].ValueKind != JsonValueKind.String
                    || !decimal.TryParse(candle[CloseIndex].GetString(), NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out var close)
                    || close <= 0m)
                {
                    continue;
                }

                var date = DateOnly.FromDateTime(DateTimeOffset.FromUnixTimeSeconds(time).UtcDateTime);
                if (date >= from && date <= to)
                {
                    closes.Add(new MarketClose(date, close, currency));
                }
            }
        }

        return Result<IReadOnlyList<MarketClose>>.Success(closes);
    }
}
