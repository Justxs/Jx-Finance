using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Dashboard;

[Collection(IntegrationCollection.Name)]
public sealed class ChartsEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Category_breakdown_attributes_split_lines_and_unsplit_transactions()
    {
        var accountResponse = await Client.PostAsJsonAsync(
            "/api/accounts",
            new { name = $"Chart test {Guid.NewGuid():N}", type = "cash", startingBalance = "1000.00" });
        var account = await accountResponse.Content.ReadFromJsonAsync<AccountDto>();

        var foodResponse = await Client.PostAsJsonAsync(
            "/api/categories",
            new { name = $"Chart Food {Guid.NewGuid():N}", type = "expense" });
        var food = await foodResponse.Content.ReadFromJsonAsync<CategoryDto>();

        var thisMonth = DateTime.UtcNow.ToString("yyyy-MM");
        var thisMonthDate = $"{thisMonth}-05";

        await Client.PostAsJsonAsync(
            "/api/transactions",
            new
            {
                accountId = account!.Id,
                categoryId = food!.Id,
                type = "expense",
                amount = "20.00",
                date = thisMonthDate,
            });

        await Client.PostAsJsonAsync(
            "/api/transactions",
            new
            {
                accountId = account.Id,
                type = "expense",
                amount = "30.00",
                date = thisMonthDate,
                lines = new object[] { new { categoryId = food.Id, amount = "30.00" } },
            });

        var breakdown = await Client.GetFromJsonAsync<BreakdownDto>($"/api/dashboard/category-breakdown?month={thisMonth}");
        var foodItem = breakdown!.Items.Single(i => i.CategoryId == food.Id);
        Assert.Equal("50.00", foodItem.Amount);
    }

    [Fact]
    public async Task Monthly_trend_returns_the_requested_number_of_months()
    {
        var trend = await Client.GetFromJsonAsync<TrendDto>("/api/dashboard/monthly-trend?months=3");
        Assert.Equal(3, trend!.Items.Count);
    }

    private sealed record AccountDto(Guid Id);

    private sealed record CategoryDto(Guid Id);

    private sealed record BreakdownItemDto(Guid? CategoryId, string CategoryName, string Amount);

    private sealed record BreakdownDto(List<BreakdownItemDto> Items);

    private sealed record TrendItemDto(int Year, int Month, string Income, string Expense);

    private sealed record TrendDto(List<TrendItemDto> Items);
}
