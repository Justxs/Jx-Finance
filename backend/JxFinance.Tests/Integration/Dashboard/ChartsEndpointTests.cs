using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Dashboard;

[Collection<ReportsCollection>]
public sealed class ChartsEndpointTests(ReportsFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Category_breakdown_attributes_split_lines_and_unsplit_transactions()
    {
        var account = await CreateAccountAsync("1000.00");
        var food = await CreateCategoryAsync();

        await PostAsync<IdDto>(
            Client,
            "/api/transactions",
            new { accountId = account, categoryId = food, type = "expense", amount = "20.00", date = Today });
        await PostAsync<IdDto>(
            Client,
            "/api/transactions",
            new
            {
                accountId = account,
                type = "expense",
                amount = "30.00",
                date = Today,
                lines = new object[] { new { categoryId = food, amount = "30.00" } },
            });

        var breakdown = await Client.GetFromJsonAsync<BreakdownDto>($"/api/dashboard/category-breakdown?month={Today:yyyy-MM}", TestContext.Current.CancellationToken);
        var foodItem = breakdown!.Items.Single(i => i.CategoryId == food);
        Assert.Equal("50.00", foodItem.Amount);
    }

    [Fact]
    public async Task Category_breakdown_compares_a_past_month_with_the_whole_month_before()
    {
        var account = await CreateAccountAsync("1000.00");
        var food = await CreateCategoryAsync();
        var month = new DateOnly(Today.Year, Today.Month, 1).AddMonths(-3);

        await PostAsync<IdDto>(
            Client,
            "/api/transactions",
            new { accountId = account, categoryId = food, type = "expense", amount = "25.00", date = month.AddDays(3) });
        await PostAsync<IdDto>(
            Client,
            "/api/transactions",
            new { accountId = account, categoryId = food, type = "expense", amount = "40.00", date = month.AddDays(-1) });

        var breakdown = await Client.GetFromJsonAsync<BreakdownDto>($"/api/dashboard/category-breakdown?month={month:yyyy-MM}", TestContext.Current.CancellationToken);
        var foodItem = breakdown!.Items.Single(i => i.CategoryId == food);
        Assert.Equal(("25.00", "40.00"), (foodItem.Amount, foodItem.ComparisonAmount));
        Assert.Equal((month.AddMonths(-1), month.AddDays(-1)), (breakdown.ComparisonStart, breakdown.ComparisonEnd));
    }

    [Fact]
    public async Task Category_breakdown_compares_the_current_month_with_the_same_days_before()
    {
        var breakdown = await Client.GetFromJsonAsync<BreakdownDto>($"/api/dashboard/category-breakdown?month={Today:yyyy-MM}", TestContext.Current.CancellationToken);
        var start = new DateOnly(Today.Year, Today.Month, 1).AddMonths(-1);
        var end = Today.AddDays(1).Day == 1 ? start.AddMonths(1).AddDays(-1) : Today.AddMonths(-1);
        Assert.Equal((start, end), (breakdown!.ComparisonStart, breakdown.ComparisonEnd));
    }

    [Fact]
    public async Task Monthly_trend_returns_the_requested_number_of_months()
    {
        var trend = await Client.GetFromJsonAsync<TrendDto>("/api/dashboard/monthly-trend?months=3", TestContext.Current.CancellationToken);
        Assert.Equal(3, trend!.Items.Count);
    }

    [Fact]
    public async Task Monthly_trend_ends_with_the_requested_month()
    {
        var last = new DateOnly(Today.Year, Today.Month, 1).AddMonths(-7);
        var trend = await Client.GetFromJsonAsync<TrendDto>($"/api/dashboard/monthly-trend?months=3&month={last:yyyy-MM}", TestContext.Current.CancellationToken);
        Assert.Equal(
            [last.AddMonths(-2), last.AddMonths(-1), last],
            trend!.Items.Select(i => new DateOnly(i.Year, i.Month, 1)));
    }

    private sealed record BreakdownItemDto(Guid? CategoryId, string CategoryName, string Amount, string? ComparisonAmount);

    private sealed record BreakdownDto(List<BreakdownItemDto> Items, DateOnly ComparisonStart, DateOnly ComparisonEnd);

    private sealed record TrendItemDto(int Year, int Month, string Income, string Expense);

    private sealed record TrendDto(List<TrendItemDto> Items);
}
