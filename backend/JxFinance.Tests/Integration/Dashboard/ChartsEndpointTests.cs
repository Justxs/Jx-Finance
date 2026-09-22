using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Dashboard;

[Collection<IntegrationCollection>]
public sealed class ChartsEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
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
    public async Task Monthly_trend_returns_the_requested_number_of_months()
    {
        var trend = await Client.GetFromJsonAsync<TrendDto>("/api/dashboard/monthly-trend?months=3", TestContext.Current.CancellationToken);
        Assert.Equal(3, trend!.Items.Count);
    }

    private sealed record BreakdownItemDto(Guid? CategoryId, string CategoryName, string Amount);

    private sealed record BreakdownDto(List<BreakdownItemDto> Items);

    private sealed record TrendItemDto(int Year, int Month, string Income, string Expense);

    private sealed record TrendDto(List<TrendItemDto> Items);
}
