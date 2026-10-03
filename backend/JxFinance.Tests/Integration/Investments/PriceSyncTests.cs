using System.Globalization;
using System.Net.Http.Json;
using JxFinance.Domain.Investments;
using JxFinance.Infrastructure.BackgroundJobs;
using JxFinance.Infrastructure.MarketPrices;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JxFinance.Tests.Integration.Investments;

[Collection<InvestmentsCollection>]
public sealed class PriceSyncTests(InvestmentsFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task With_the_switch_off_the_job_writes_nothing_and_calls_no_provider()
    {
        await SaveMarketPricesAsync(enabled: false, key: "test-key");
        var held = await MappedHoldingAsync("eodhd", $"{NewSymbol()}.XETRA");
        var calls = Eodhd.Calls.Count + Kraken.Calls.Count;

        await Job<PriceSyncJob>().RunOnceAsync(TestContext.Current.CancellationToken);

        Assert.Equal(calls, Eodhd.Calls.Count + Kraken.Calls.Count);
        Assert.Empty(await PricesAsync(held.SecurityId));
    }

    [Fact]
    public async Task With_it_on_a_held_mapped_security_gets_its_missing_days()
    {
        await SaveMarketPricesAsync(enabled: true, key: "test-key");
        await ResetBudgetAsync();
        var symbol = $"{NewSymbol()}.XETRA";
        var held = await MappedHoldingAsync("eodhd", symbol);

        await Job<PriceSyncJob>().RunOnceAsync(TestContext.Current.CancellationToken);

        var call = Assert.Single(Eodhd.Calls, c => c.Symbol == symbol);
        Assert.Equal((held.FirstTrade, Today.AddDays(-1)), (call.From, call.To));
        var prices = await PricesAsync(held.SecurityId);
        Assert.Equal(Weekdays(held.FirstTrade, Today.AddDays(-1)), prices.Select(p => p.Date).Order().ToList());
        Assert.All(prices, p => Assert.Equal("feed", p.Source));

        await Job<PriceSyncJob>().RunOnceAsync(TestContext.Current.CancellationToken);

        Assert.Single(Eodhd.Calls, c => c.Symbol == symbol);
        await SaveMarketPricesAsync(enabled: false, key: null);
    }

    [Fact]
    public async Task After_a_restart_the_stored_quote_currency_keeps_a_fetch_at_one_call()
    {
        await SaveMarketPricesAsync(enabled: true, key: "test-key");
        await ResetBudgetAsync();
        var symbol = $"{NewSymbol()}.XETRA";
        var held = await MappedHoldingAsync("eodhd", symbol);
        await Job<PriceSyncJob>().RunOnceAsync(TestContext.Current.CancellationToken);
        Assert.Equal("EUR", (await SecurityAsync(held.SecurityId)).PriceQuoteCurrency);

        var yesterday = new DateTimeOffset(Today.AddDays(-1).ToDateTime(new TimeOnly(12, 0)), TimeSpan.Zero);
        await SqlAsync($"""UPDATE "Securities" SET "PriceSyncedAt" = {yesterday}, "LastPriceDate" = {held.FirstTrade} WHERE "Id" = {held.SecurityId}""");
        await SqlAsync($"""UPDATE "InstanceSettings" SET "PriceCallsDate" = {Today}, "PriceCallsUsed" = 19""");
        await Job<PriceSyncJob>().RunOnceAsync(TestContext.Current.CancellationToken);

        Assert.Equal(2, Eodhd.Calls.Count(c => c.Symbol == symbol));
        var settings = await ReadOkAsync<MarketPriceSettingsDto>(await Client.GetAsync("/api/settings/market-prices", TestContext.Current.CancellationToken));
        Assert.Equal(0, settings.CallsLeft);
        await SaveMarketPricesAsync(enabled: false, key: null);
        await ResetBudgetAsync();
    }

    [Fact]
    public async Task Kraken_prices_crypto_every_day_of_the_week()
    {
        await SaveMarketPricesAsync(enabled: false, key: "test-key");
        await ResetBudgetAsync();
        var held = await MappedHoldingAsync("kraken", "XBTEUR", type: "crypto");

        await SyncNowAsync();

        Assert.Contains(Kraken.Calls, c => c.Symbol == "XBTEUR");
        Assert.Equal(Today.AddDays(-1).DayNumber - held.FirstTrade.DayNumber + 1, (await PricesAsync(held.SecurityId)).Count);
    }

    [Fact]
    public async Task A_security_nobody_holds_is_skipped()
    {
        await SaveMarketPricesAsync(enabled: false, key: "test-key");
        await ResetBudgetAsync();
        var symbol = $"{NewSymbol()}.XETRA";
        var sold = await MappedHoldingAsync("eodhd", symbol);
        await RecordInvestmentAsync(Client, new { accountId = sold.AccountId, securityId = sold.SecurityId, type = "sell", date = sold.FirstTrade.AddDays(1).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture), quantity = "2", price = "100" });

        await SyncNowAsync();

        Assert.DoesNotContain(Eodhd.Calls, c => c.Symbol == symbol);
        Assert.Empty(await PricesAsync(sold.SecurityId));
    }

    [Fact]
    public async Task A_hand_price_on_the_same_date_is_kept()
    {
        await SaveMarketPricesAsync(enabled: false, key: "test-key");
        await ResetBudgetAsync();
        var held = await MappedHoldingAsync("eodhd", $"{NewSymbol()}.XETRA");
        var handDay = held.FirstTrade;
        (await Client.PutAsJsonAsync(
            $"/api/investments/securities/{held.SecurityId}/price",
            new { lastPrice = "42.5", lastPriceDate = handDay.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) },
            TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        await SyncNowAsync();

        var prices = await PricesAsync(held.SecurityId);
        Assert.Equal(new PriceDto(handDay, "42.5", "manual"), prices.Single(p => p.Date == handDay));
        Assert.Contains(prices, p => p.Source == "feed");
    }

    [Fact]
    public async Task A_currency_mismatch_stores_the_error_and_writes_nothing()
    {
        await SaveMarketPricesAsync(enabled: false, key: "test-key");
        await ResetBudgetAsync();
        var symbol = $"{NewSymbol()}.US";
        Eodhd.QuoteIn(symbol, "USD");
        var held = await MappedHoldingAsync("eodhd", symbol);

        var result = await SyncNowAsync();

        Assert.True(result.Failed >= 1);
        Assert.Empty(await PricesAsync(held.SecurityId));
        var security = await SecurityAsync(held.SecurityId);
        Assert.Contains("USD", security.PriceSyncError, StringComparison.Ordinal);
        var settings = await ReadOkAsync<MarketPriceSettingsDto>(await Client.GetAsync("/api/settings/market-prices", TestContext.Current.CancellationToken));
        Assert.Contains(settings.Failures, f => f.SecurityId == held.SecurityId && f.Reason.Contains("USD", StringComparison.Ordinal));
    }

    [Fact]
    public async Task The_twenty_first_eodhd_call_of_a_day_is_not_made()
    {
        await SaveMarketPricesAsync(enabled: false, key: "test-key");
        var symbol = $"{NewSymbol()}.XETRA";
        var held = await MappedHoldingAsync("eodhd", symbol);
        await SqlAsync($"""UPDATE "InstanceSettings" SET "PriceCallsDate" = {Today}, "PriceCallsUsed" = 20""");

        var result = await SyncNowAsync();

        Assert.Equal(0, result.CallsLeft);
        Assert.DoesNotContain(Eodhd.Calls, c => c.Symbol == symbol);
        Assert.Empty(await PricesAsync(held.SecurityId));
        Assert.Null((await SecurityAsync(held.SecurityId)).PriceSyncError);
        await ResetBudgetAsync();
    }

    [Fact]
    public async Task The_value_history_is_no_longer_partial_after_a_sync()
    {
        await SaveMarketPricesAsync(enabled: false, key: "test-key");
        await ResetBudgetAsync();
        using var member = await CreateUserClientAsync();
        var held = await MappedHoldingAsync("eodhd", $"{NewSymbol()}.XETRA", holder: member);
        var range = $"accountId={held.AccountId}&from={held.FirstTrade:yyyy-MM-dd}&to={Today:yyyy-MM-dd}";

        var before = await member.GetFromJsonAsync<HistoryDto>($"/api/investments/value-history?{range}", TestContext.Current.CancellationToken);
        await SyncNowAsync();
        var after = await member.GetFromJsonAsync<HistoryDto>($"/api/investments/value-history?{range}", TestContext.Current.CancellationToken);

        Assert.All(before!.Points, p => Assert.True(p.IsPartial));
        Assert.NotEmpty(after!.Points);
        Assert.All(after.Points, p => Assert.False(p.IsPartial));
    }

    private FixedPriceProvider Eodhd => Provider(PriceSource.Eodhd);

    private FixedPriceProvider Kraken => Provider(PriceSource.Kraken);

    private FixedPriceProvider Provider(PriceSource source) =>
        Services.GetServices<IMarketPriceProvider>().OfType<FixedPriceProvider>().Single(p => p.Source == source);

    private DateOnly LastWeekdayBefore(int days)
    {
        var day = Today.AddDays(-days);
        while (day.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday)
        {
            day = day.AddDays(-1);
        }

        return day;
    }

    private static List<DateOnly> Weekdays(DateOnly from, DateOnly to)
    {
        var days = new List<DateOnly>();
        for (var day = from; day <= to; day = day.AddDays(1))
        {
            if (day.DayOfWeek is not (DayOfWeek.Saturday or DayOfWeek.Sunday))
            {
                days.Add(day);
            }
        }

        return days;
    }

    private async Task<Holding> MappedHoldingAsync(string source, string symbol, string type = "etf", HttpClient? holder = null)
    {
        var client = holder ?? Client;
        var account = await CreateAccountAsync("5000.00", "investment", client: client);
        var security = (await PostAsync<IdDto>(
            Client,
            "/api/investments/securities",
            new { symbol = NewSymbol(), name = "Fetched fund", type, currency = "eur", priceSource = source, priceSymbol = symbol })).Id;
        var firstTrade = LastWeekdayBefore(10);
        await RecordInvestmentAsync(client, new { accountId = account, securityId = security, type = "buy", date = firstTrade.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture), quantity = "2", price = "100" });
        return new Holding(account, security, firstTrade);
    }

    private async Task SaveMarketPricesAsync(bool enabled, string? key) =>
        (await Client.PutAsJsonAsync("/api/settings/market-prices", new { enabled, eodhdApiKey = key }, TestContext.Current.CancellationToken))
            .EnsureSuccessStatusCode();

    private Task ResetBudgetAsync() => SqlAsync($"""UPDATE "InstanceSettings" SET "PriceCallsUsed" = 0""");

    private async Task<SyncDto> SyncNowAsync() =>
        await ReadOkAsync<SyncDto>(await Client.PostAsync("/api/settings/market-prices/sync", null, TestContext.Current.CancellationToken));

    private async Task<List<PriceDto>> PricesAsync(Guid securityId) =>
        (await Client.GetFromJsonAsync<List<PriceDto>>($"/api/investments/securities/{securityId}/prices", TestContext.Current.CancellationToken))!;

    private Task<Security> SecurityAsync(Guid securityId) =>
        WithDbAsync(db => db.Securities.AsNoTracking().SingleAsync(s => s.Id == new SecurityId(securityId), TestContext.Current.CancellationToken));

    private sealed record Holding(Guid AccountId, Guid SecurityId, DateOnly FirstTrade);

    private sealed record PriceDto(DateOnly Date, string Price, string Source);

    private sealed record SyncDto(int Checked, int Written, int Failed, int CallsLeft);

    private sealed record FailureDto(Guid SecurityId, string Symbol, string Reason);

    private sealed record MarketPriceSettingsDto(bool Enabled, bool HasKey, int CallsLeft, List<FailureDto> Failures);

    private sealed record HistoryDto(List<PointDto> Points);

    private sealed record PointDto(DateOnly Date, bool IsPartial);
}
