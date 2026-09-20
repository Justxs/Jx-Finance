using System.Globalization;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Dashboard;

[Collection<IntegrationCollection>]
public sealed class DashboardIsolationTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Summary_breakdown_and_trend_count_only_what_the_caller_can_see()
    {
        var owner = await CreateUserAsync();
        var partner = await CreateUserAsync();
        var household = await CreateHouseholdAsync(owner, partner);
        using var ownerClient = await LoginAsync(owner);
        using var partnerClient = await LoginAsync(partner);
        using var stranger = await CreateUserClientAsync();
        var month = Today.ToString("yyyy-MM", CultureInfo.InvariantCulture);
        var firstOfMonth = new DateOnly(Today.Year, Today.Month, 1);
        var shared = await CreateAccountAsync("100.00", householdId: household, client: ownerClient);
        var personal = await CreateAccountAsync("50.00", client: ownerClient);
        var food = await CreateCategoryAsync(client: ownerClient);
        await RecordTransactionAsync(ownerClient, new { accountId = shared, categoryId = food, type = "expense", amount = "12.00", date = firstOfMonth });
        await RecordTransactionAsync(ownerClient, new { accountId = personal, categoryId = food, type = "expense", amount = "30.00", date = firstOfMonth });
        await RecordTransactionAsync(ownerClient, new { accountId = personal, type = "income", amount = "5.00", date = firstOfMonth });

        var ownerSummary = await ownerClient.GetFromJsonAsync<SummaryDto>("/api/dashboard/summary");
        var partnerSummary = await partnerClient.GetFromJsonAsync<SummaryDto>("/api/dashboard/summary");
        var strangerSummary = await stranger.GetFromJsonAsync<SummaryDto>("/api/dashboard/summary");
        var ownerBreakdown = await ownerClient.GetFromJsonAsync<BreakdownDto>($"/api/dashboard/category-breakdown?month={month}");
        var partnerBreakdown = await partnerClient.GetFromJsonAsync<BreakdownDto>($"/api/dashboard/category-breakdown?month={month}");
        var strangerBreakdown = await stranger.GetFromJsonAsync<BreakdownDto>($"/api/dashboard/category-breakdown?month={month}");
        var partnerTrend = await partnerClient.GetFromJsonAsync<TrendDto>("/api/dashboard/monthly-trend?months=1");
        var strangerTrend = await stranger.GetFromJsonAsync<TrendDto>("/api/dashboard/monthly-trend?months=1");

        Assert.Equal(new SummaryDto("113.00", "5.00", "42.00"), ownerSummary);
        Assert.Equal(new SummaryDto("88.00", "0.00", "12.00"), partnerSummary);
        Assert.Equal(new SummaryDto("0.00", "0.00", "0.00"), strangerSummary);
        Assert.Equal(new ItemDto(food, "42.00"), Assert.Single(ownerBreakdown!.Items));
        Assert.Equal("12.00", Assert.Single(partnerBreakdown!.Items).Amount);
        Assert.Empty(strangerBreakdown!.Items);
        Assert.Equal(new MonthDto(Today.Year, Today.Month, "0.00", "12.00"), Assert.Single(partnerTrend!.Items));
        Assert.Equal(new MonthDto(Today.Year, Today.Month, "0.00", "0.00"), Assert.Single(strangerTrend!.Items));
    }

    private sealed record SummaryDto(string TotalBalance, string MonthIncome, string MonthExpense);

    private sealed record ItemDto(Guid? CategoryId, string Amount);

    private sealed record BreakdownDto(List<ItemDto> Items);

    private sealed record MonthDto(int Year, int Month, string Income, string Expense);

    private sealed record TrendDto(List<MonthDto> Items);
}
