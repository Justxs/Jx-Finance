using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Dashboard;

[Collection<IntegrationCollection>]
public sealed class DashboardEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Summary_reflects_new_accounts_and_this_months_transactions()
    {
        using var member = await CreateUserClientAsync();
        var before = await member.GetFromJsonAsync<SummaryDto>("/api/dashboard/summary", TestContext.Current.CancellationToken);

        var account = await CreateAccountAsync("10.00", client: member);
        await PostAsync<IdDto>(
            member,
            "/api/transactions",
            new { accountId = account, type = "income", amount = "5.00", date = before!.MonthStart });

        var after = await member.GetFromJsonAsync<SummaryDto>("/api/dashboard/summary", TestContext.Current.CancellationToken);

        Assert.Equal(15.00m, Parse(after!.TotalBalance) - Parse(before.TotalBalance));
        Assert.Equal(5.00m, Parse(after.MonthIncome) - Parse(before.MonthIncome));
        Assert.Equal(Parse(before.MonthExpense), Parse(after.MonthExpense));
        Assert.Equal(1, after.MonthStart.Day);
    }

    [Theory]
    [InlineData("/api/dashboard/summary?month=2026-13")]
    [InlineData("/api/dashboard/category-breakdown?month=August")]
    [InlineData("/api/dashboard/monthly-trend?month=1999-12")]
    public async Task A_malformed_month_is_refused_instead_of_showing_the_current_one(string url)
    {
        using var member = await CreateUserClientAsync();

        var response = await member.GetAsync(url, TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, "month.invalid");
    }

    [Fact]
    public async Task Summary_of_an_earlier_month_counts_that_month_and_its_balance_at_month_end()
    {
        using var member = await CreateUserClientAsync();
        var earlier = new DateOnly(Today.Year, Today.Month, 1).AddMonths(-6);
        var account = await CreateAccountAsync("100.00", client: member);
        await PostAsync<IdDto>(
            member,
            "/api/transactions",
            new { accountId = account, type = "expense", amount = "40.00", date = earlier.AddDays(14) });
        await PostAsync<IdDto>(
            member,
            "/api/transactions",
            new { accountId = account, type = "income", amount = "25.00", date = earlier.AddMonths(1) });

        var past = await member.GetFromJsonAsync<SummaryDto>($"/api/dashboard/summary?month={earlier:yyyy-MM}", TestContext.Current.CancellationToken);
        var current = await member.GetFromJsonAsync<SummaryDto>("/api/dashboard/summary", TestContext.Current.CancellationToken);

        Assert.Equal(earlier, past!.MonthStart);
        Assert.Equal(earlier.AddMonths(1).AddDays(-1), past.MonthEnd);
        Assert.Equal("40.00", past.MonthExpense);
        Assert.Equal("60.00", past.TotalBalance);
        Assert.Equal("85.00", current!.TotalBalance);
    }

    [Fact]
    public async Task Summary_of_an_earlier_month_values_holdings_at_that_months_prices()
    {
        using var member = await CreateUserClientAsync();
        var earlier = new DateOnly(Today.Year, Today.Month, 1).AddMonths(-6);
        var account = await CreateAccountAsync("5000.00", "investment", client: member);
        var priced = await CreateSecurityAsync(member);
        var pricedLater = await CreateSecurityAsync(member);
        await RecordInvestmentAsync(member, new { accountId = account, securityId = priced, type = "buy", date = earlier.AddDays(9), quantity = "1", price = "100" });
        await RecordInvestmentAsync(member, new { accountId = account, securityId = pricedLater, type = "buy", date = earlier.AddDays(9), quantity = "1", price = "50" });
        await SetPriceAsync(member, priced, "150", earlier.AddDays(19));
        await SetPriceAsync(member, priced, "300", Today);
        await SetPriceAsync(member, pricedLater, "60", Today);

        var past = await member.GetFromJsonAsync<SummaryDto>($"/api/dashboard/summary?month={earlier:yyyy-MM}", TestContext.Current.CancellationToken);
        var current = await member.GetFromJsonAsync<SummaryDto>("/api/dashboard/summary", TestContext.Current.CancellationToken);

        Assert.Equal("5000.00", past!.TotalBalance);
        Assert.False(past.IsComplete);
        Assert.Equal("5210.00", current!.TotalBalance);
        Assert.True(current.IsComplete);
    }

    [Fact]
    public async Task Summary_says_when_the_total_leaves_out_a_holding_it_could_not_value()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("5000.00", "investment", client: member);
        Assert.True((await member.GetFromJsonAsync<SummaryDto>("/api/dashboard/summary", TestContext.Current.CancellationToken))!.IsComplete);

        var unpriced = await CreateSecurityAsync(member);
        await RecordInvestmentAsync(member, new { accountId = account, securityId = unpriced, type = "buy", date = "2026-06-01", quantity = "1", price = "100" });

        var summary = await member.GetFromJsonAsync<SummaryDto>("/api/dashboard/summary", TestContext.Current.CancellationToken);
        Assert.False(summary!.IsComplete);
        Assert.Equal("4900.00", summary.TotalBalance);
    }

    private static async Task SetPriceAsync(HttpClient client, Guid securityId, string lastPrice, DateOnly lastPriceDate)
    {
        var response = await client.PutAsJsonAsync($"/api/investments/securities/{securityId}/price", new { lastPrice, lastPriceDate }, TestContext.Current.CancellationToken);
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
    }

    private static decimal Parse(string money) => decimal.Parse(money, CultureInfo.InvariantCulture);

    private sealed record SummaryDto(
        string TotalBalance,
        string MonthIncome,
        string MonthExpense,
        DateOnly MonthStart,
        DateOnly MonthEnd,
        bool IsComplete);
}
