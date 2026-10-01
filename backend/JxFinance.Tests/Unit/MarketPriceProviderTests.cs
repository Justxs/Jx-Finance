using System.Net;
using System.Text;
using JxFinance.Common.Errors;
using JxFinance.Domain.Investments;
using JxFinance.Infrastructure.MarketPrices;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Unit;

public sealed class MarketPriceProviderTests
{
    private const string Key = "secret-eodhd-key";

    [Fact]
    public async Task Eodhd_closes_carry_the_currency_its_search_reports()
    {
        var http = new RecordedHttp()
            .Answer("api/search/VWCE", SampleMarketPrices.EodhdSearchXetra)
            .Answer("api/eod/VWCE.XETRA", SampleMarketPrices.EodhdEodXetra);
        var provider = new EodhdPriceProvider(http.Client("https://eodhd.com/"), new EodhdQuoteCurrencies());

        var security = Listed("VWCE.XETRA");

        var closes = await provider.CloseAsync(security, new DateOnly(2026, 9, 25), new DateOnly(2026, 9, 29), Key, TestContext.Current.CancellationToken);

        Assert.True(closes.IsSuccess, closes.ErrorMessage);
        Assert.Equal("EUR", security.PriceQuoteCurrency);
        Assert.Equal(
            [
                new MarketClose(new DateOnly(2026, 9, 25), 139.3m, "EUR"),
                new MarketClose(new DateOnly(2026, 9, 28), 139.62m, "EUR"),
            ],
            closes.Value!);
        Assert.Contains(http.Requests, uri => uri.Contains("from=2026-09-25&to=2026-09-29&fmt=json", StringComparison.Ordinal));
        Assert.Contains(http.Requests, uri => uri.Contains("exchange=XETRA", StringComparison.Ordinal));
    }

    [Fact]
    public async Task Eodhd_counts_two_calls_until_the_currency_is_stored_and_one_after()
    {
        var http = new RecordedHttp()
            .Answer("api/search/VWRP", SampleMarketPrices.EodhdSearchLse)
            .Answer("api/eod/VWRP.LSE", SampleMarketPrices.EodhdEodLse);
        var provider = new EodhdPriceProvider(http.Client("https://eodhd.com/"), new EodhdQuoteCurrencies());
        var security = Listed("VWRP.LSE");
        Assert.Equal(2, provider.CallsFor(security));

        var first = await provider.CloseAsync(security, new DateOnly(2026, 9, 28), new DateOnly(2026, 9, 28), Key, TestContext.Current.CancellationToken);

        Assert.Equal([new MarketClose(new DateOnly(2026, 9, 28), 12134m, "GBX")], first.Value!);
        Assert.Equal("GBX", security.PriceQuoteCurrency);
        Assert.Equal(1, provider.CallsFor(security));
        Assert.Equal(2, http.Requests.Count);
    }

    [Fact]
    public async Task Eodhd_with_a_stored_currency_spends_one_call_after_a_restart()
    {
        var http = new RecordedHttp().Answer("api/eod/VWRP.LSE", SampleMarketPrices.EodhdEodLse);
        var restarted = new EodhdPriceProvider(http.Client("https://eodhd.com/"), new EodhdQuoteCurrencies());
        var security = Listed("VWRP.LSE", "GBX");
        Assert.Equal(1, restarted.CallsFor(security));

        var closes = await restarted.CloseAsync(security, new DateOnly(2026, 9, 28), new DateOnly(2026, 9, 28), Key, TestContext.Current.CancellationToken);

        Assert.Equal([new MarketClose(new DateOnly(2026, 9, 28), 12134m, "GBX")], closes.Value!);
        Assert.DoesNotContain(http.Requests, uri => uri.Contains("api/search/", StringComparison.Ordinal));
        Assert.Single(http.Requests);
    }

    [Fact]
    public async Task Eodhd_find_lists_every_listing_of_the_isin_and_spares_the_lookup_of_the_chosen_one()
    {
        var http = new RecordedHttp().Answer("api/search/IE00BK5BQT80", SampleMarketPrices.EodhdSearchByIsin);
        var provider = new EodhdPriceProvider(http.Client("https://eodhd.com/"), new EodhdQuoteCurrencies());

        var found = await provider.FindAsync("IE00BK5BQT80", Key, TestContext.Current.CancellationToken);

        Assert.Equal(
            ["VWCE.XETRA EUR", "VWRP.LSE GBX", "VWCE.MI EUR"],
            found.Value!.Select(c => $"{c.Symbol} {c.Currency}"));
        var chosen = Listed("VWRP.LSE");
        Assert.Equal(1, provider.CallsFor(chosen));

        http.Answer("api/eod/VWRP.LSE", SampleMarketPrices.EodhdEodLse);
        await provider.CloseAsync(chosen, new DateOnly(2026, 9, 28), new DateOnly(2026, 9, 28), Key, TestContext.Current.CancellationToken);

        Assert.Equal("GBX", chosen.PriceQuoteCurrency);
        Assert.Single(http.Requests, uri => uri.Contains("api/search/", StringComparison.Ordinal));
    }

    [Theory]
    [InlineData(HttpStatusCode.Unauthorized, "Unauthenticated", ErrorCodes.MarketPricesRejected)]
    [InlineData(HttpStatusCode.NotFound, "Ticker Not Found", ErrorCodes.MarketPricesRejected)]
    [InlineData(HttpStatusCode.PaymentRequired, "You exceeded your daily API requests limit", ErrorCodes.MarketPricesRejected)]
    [InlineData(HttpStatusCode.BadGateway, "", ErrorCodes.MarketPricesUnavailable)]
    public async Task Eodhd_failures_name_the_reason(HttpStatusCode status, string body, string code)
    {
        var http = new RecordedHttp().Answer("api/eod/VWCE.XETRA", body, status);
        var provider = new EodhdPriceProvider(http.Client("https://eodhd.com/"), new EodhdQuoteCurrencies());

        var closes = await provider.CloseAsync(Listed("VWCE.XETRA", "EUR"), new DateOnly(2026, 9, 25), new DateOnly(2026, 9, 29), Key, TestContext.Current.CancellationToken);

        Assert.Equal(code, closes.ErrorCode);
        Assert.Contains(body, closes.ErrorMessage, StringComparison.Ordinal);
        Assert.DoesNotContain(Key, closes.ErrorMessage, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Eodhd_without_a_key_asks_for_one_and_calls_nothing()
    {
        var http = new RecordedHttp();
        var provider = new EodhdPriceProvider(http.Client("https://eodhd.com/"), new EodhdQuoteCurrencies());

        var closes = await provider.CloseAsync(Listed("VWCE.XETRA"), new DateOnly(2026, 9, 25), new DateOnly(2026, 9, 29), null, TestContext.Current.CancellationToken);

        Assert.Equal(ErrorCodes.MarketPricesKeyRequired, closes.ErrorCode);
        Assert.Empty(http.Requests);
    }

    [Fact]
    public async Task Kraken_reads_daily_candles_within_the_range_in_the_quote_currency()
    {
        var http = new RecordedHttp().Answer("0/public/OHLC", SampleMarketPrices.KrakenOhlcXbtEur);
        var provider = new KrakenPriceProvider(http.Client("https://api.kraken.com/"));

        var coin = Listed("XBTEUR");

        var closes = await provider.CloseAsync(coin, new DateOnly(2026, 9, 25), new DateOnly(2026, 9, 26), null, TestContext.Current.CancellationToken);

        Assert.Equal(
            [
                new MarketClose(new DateOnly(2026, 9, 25), 95880.4m, "EUR"),
                new MarketClose(new DateOnly(2026, 9, 26), 96122.7m, "EUR"),
            ],
            closes.Value!);
        Assert.Contains("pair=XBTEUR&interval=1440&since=1790294399", Assert.Single(http.Requests), StringComparison.Ordinal);
        Assert.Equal(0, provider.CallsFor(coin));
    }

    [Fact]
    public async Task Kraken_errors_are_its_own_words()
    {
        var http = new RecordedHttp().Answer("0/public/OHLC", SampleMarketPrices.KrakenUnknownPair);
        var provider = new KrakenPriceProvider(http.Client("https://api.kraken.com/"));

        var closes = await provider.CloseAsync(Listed("NOPEEUR"), new DateOnly(2026, 9, 25), new DateOnly(2026, 9, 26), null, TestContext.Current.CancellationToken);

        Assert.Equal(ErrorCodes.MarketPricesRejected, closes.ErrorCode);
        Assert.Contains("Unknown asset pair", closes.ErrorMessage, StringComparison.Ordinal);
    }

    private static Security Listed(string symbol, string? quoteCurrency = null) =>
        new() { PriceSource = PriceSource.Eodhd, PriceSymbol = symbol, PriceQuoteCurrency = quoteCurrency };

    private sealed class RecordedHttp : HttpMessageHandler
    {
        private readonly List<(string Path, string Body, HttpStatusCode Status)> answers = [];

        public List<string> Requests { get; } = [];

        public RecordedHttp Answer(string path, string body, HttpStatusCode status = HttpStatusCode.OK)
        {
            answers.Add((path, body, status));
            return this;
        }

        public HttpClient Client(string baseAddress) => new(this) { BaseAddress = new Uri(baseAddress) };

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var uri = request.RequestUri!.PathAndQuery;
            Requests.Add(uri);
            var (_, body, status) = answers.FirstOrDefault(a => uri.StartsWith("/" + a.Path, StringComparison.Ordinal));
            return Task.FromResult(new HttpResponseMessage(body is null ? HttpStatusCode.NotFound : status)
            {
                Content = new StringContent(body ?? "", Encoding.UTF8, "application/json"),
            });
        }
    }
}
