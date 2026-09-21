using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Investments;

[Collection<IntegrationCollection>]
public sealed class PortfolioValueHistoryTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Value_and_cost_follow_a_buy_a_price_change_a_split_and_a_sell()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("5000.00", "investment", client: member);
        var fund = await CreateSecurityAsync(member);
        await RecordInvestmentAsync(member, new { accountId = account, securityId = fund, type = "buy", date = "2026-03-02", quantity = "10", price = "100" });
        await SetPriceAsync(member, fund, "100", "2026-03-02");
        await SetPriceAsync(member, fund, "110", "2026-03-10");
        await RecordInvestmentAsync(member, new { accountId = account, securityId = fund, type = "split", date = "2026-03-16", quantity = "2" });
        await SetPriceAsync(member, fund, "55", "2026-03-16");
        await RecordInvestmentAsync(member, new { accountId = account, securityId = fund, type = "sell", date = "2026-03-20", quantity = "5", price = "60" });
        await SetPriceAsync(member, fund, "60", "2026-03-20");

        var history = await HistoryAsync(member, "from=2026-03-01&to=2026-03-25");

        Assert.Equal("eur", history.ReportingCurrency);
        Assert.Equal(24, history.Points.Count);
        Assert.Equal(new DateOnly(2026, 3, 2), history.Points[0].Date);
        Assert.Equal(new DateOnly(2026, 3, 25), history.Points[^1].Date);
        Assert.Equal(new PointDto(new DateOnly(2026, 3, 2), "1000.00", "1000.00", false), On(history, 3, 2));
        Assert.Equal(new PointDto(new DateOnly(2026, 3, 9), "1000.00", "1000.00", false), On(history, 3, 9));
        Assert.Equal(new PointDto(new DateOnly(2026, 3, 10), "1100.00", "1000.00", false), On(history, 3, 10));
        Assert.Equal(new PointDto(new DateOnly(2026, 3, 16), "1100.00", "1000.00", false), On(history, 3, 16));
        Assert.Equal(new PointDto(new DateOnly(2026, 3, 20), "900.00", "750.00", false), On(history, 3, 20));
        Assert.Equal(new PointDto(new DateOnly(2026, 3, 25), "900.00", "750.00", false), On(history, 3, 25));
    }

    [Fact]
    public async Task A_position_without_a_price_yet_is_left_out_and_the_point_is_partial()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("5000.00", "investment", client: member);
        var priced = await CreateSecurityAsync(member);
        var unpriced = await CreateSecurityAsync(member);
        await RecordInvestmentAsync(member, new { accountId = account, securityId = priced, type = "buy", date = "2026-03-02", quantity = "1", price = "100" });
        await RecordInvestmentAsync(member, new { accountId = account, securityId = unpriced, type = "buy", date = "2026-03-04", quantity = "1", price = "300" });
        await SetPriceAsync(member, priced, "100", "2026-03-03");
        await SetPriceAsync(member, unpriced, "310", "2026-03-06");

        var history = await HistoryAsync(member, "from=2026-03-02&to=2026-03-06");

        Assert.Equal(
            [
                new PointDto(new DateOnly(2026, 3, 2), "0.00", "0.00", true),
                new PointDto(new DateOnly(2026, 3, 3), "100.00", "100.00", false),
                new PointDto(new DateOnly(2026, 3, 4), "100.00", "100.00", true),
                new PointDto(new DateOnly(2026, 3, 5), "100.00", "100.00", true),
                new PointDto(new DateOnly(2026, 3, 6), "410.00", "400.00", false),
            ],
            history.Points);
    }

    [Fact]
    public async Task A_foreign_position_is_converted_at_the_rate_of_the_point_and_costs_what_was_paid()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("5000.00", "investment", client: member);
        var stock = (await PostAsync<IdDto>(
            member,
            "/api/investments/securities",
            new { symbol = NewSymbol(), name = "Dollar stock", type = "stock", currency = "usd" })).Id;
        await RecordInvestmentAsync(member, new { accountId = account, securityId = stock, type = "buy", date = "2026-03-02", quantity = "10", price = "110" });
        await SetPriceAsync(member, stock, "121", "2026-03-03");

        var history = await HistoryAsync(member, "from=2026-03-03&to=2026-03-03");

        Assert.Equal([new PointDto(new DateOnly(2026, 3, 3), "1100.00", "1000.00", false)], history.Points);
    }

    [Fact]
    public async Task Positions_on_accounts_the_caller_cannot_see_are_excluded()
    {
        using var owner = await CreateUserClientAsync();
        using var stranger = await CreateUserClientAsync();
        var account = await CreateAccountAsync("5000.00", "investment", client: owner);
        var other = await CreateAccountAsync("5000.00", "investment", client: owner);
        var fund = await CreateSecurityAsync(owner);
        await RecordInvestmentAsync(owner, new { accountId = account, securityId = fund, type = "buy", date = "2026-03-02", quantity = "1", price = "100" });
        await RecordInvestmentAsync(owner, new { accountId = other, securityId = fund, type = "buy", date = "2026-03-02", quantity = "2", price = "100" });
        await SetPriceAsync(owner, fund, "100", "2026-03-02");

        var everything = await HistoryAsync(owner, "from=2026-03-02&to=2026-03-02");
        var oneAccount = await HistoryAsync(owner, $"from=2026-03-02&to=2026-03-02&accountId={account}");
        var hidden = await HistoryAsync(stranger, "from=2026-03-02&to=2026-03-02");
        var hiddenByAccount = await HistoryAsync(stranger, $"from=2026-03-02&to=2026-03-02&accountId={account}");

        Assert.Equal("300.00", Assert.Single(everything.Points).MarketValue);
        Assert.Equal("100.00", Assert.Single(oneAccount.Points).MarketValue);
        Assert.Empty(hidden.Points);
        Assert.Empty(hiddenByAccount.Points);
    }

    [Fact]
    public async Task A_long_range_is_sampled_weekly_or_monthly_from_the_first_trade_to_the_end_date()
    {
        using var member = await CreateUserClientAsync();
        var recent = await CreateAccountAsync("5000.00", "investment", client: member);
        var old = await CreateAccountAsync("5000.00", "investment", client: member);
        var fund = await CreateSecurityAsync(member);
        await RecordInvestmentAsync(member, new { accountId = recent, securityId = fund, type = "buy", date = "2025-10-01", quantity = "1", price = "100" });
        await RecordInvestmentAsync(member, new { accountId = old, securityId = fund, type = "buy", date = "2023-01-10", quantity = "1", price = "100" });
        await SetPriceAsync(member, fund, "100", "2023-01-10");

        var weekly = await HistoryAsync(member, $"from=2020-01-01&to=2026-03-25&accountId={recent}");
        var monthly = await HistoryAsync(member, $"from=2020-01-01&to=2026-03-25&accountId={old}");

        var weeks = weekly.Points.Select(p => p.Date).ToList();
        Assert.Equal(new DateOnly(2025, 10, 1), weeks[0]);
        Assert.Equal(new DateOnly(2026, 3, 25), weeks[^1]);
        Assert.All(weeks.Skip(1).Zip(weeks.Skip(2)), pair => Assert.Equal(7, pair.Second.DayNumber - pair.First.DayNumber));
        var months = monthly.Points.Select(p => p.Date).ToList();
        Assert.Equal(40, months.Count);
        Assert.Equal([new DateOnly(2023, 1, 10), new DateOnly(2023, 1, 25), new DateOnly(2023, 2, 25)], months.Take(3));
        Assert.Equal(new DateOnly(2026, 3, 25), months[^1]);
        Assert.All(monthly.Points, p => Assert.Equal(("100.00", "100.00", false), (p.MarketValue, p.CostBasis, p.IsPartial)));
    }

    [Fact]
    public async Task A_range_that_starts_after_it_ends_is_rejected_and_an_empty_portfolio_has_no_points()
    {
        using var member = await CreateUserClientAsync();

        var response = await member.GetAsync("/api/investments/value-history?from=2026-03-02&to=2026-03-01");
        var empty = await HistoryAsync(member, string.Empty);

        await AssertValidationErrorAsync(response, "from");
        Assert.Empty(empty.Points);
    }

    private static PointDto On(HistoryDto history, int month, int day) =>
        history.Points.Single(p => p.Date == new DateOnly(2026, month, day));

    private static async Task SetPriceAsync(HttpClient client, Guid id, string lastPrice, string lastPriceDate)
    {
        var response = await client.PutAsJsonAsync($"/api/investments/securities/{id}/price", new { lastPrice, lastPriceDate });
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
    }

    private static async Task<HistoryDto> HistoryAsync(HttpClient client, string query) =>
        (await client.GetFromJsonAsync<HistoryDto>($"/api/investments/value-history?{query}"))!;

    private sealed record PointDto(DateOnly Date, string MarketValue, string CostBasis, bool IsPartial);

    private sealed record HistoryDto(string ReportingCurrency, List<PointDto> Points);
}
