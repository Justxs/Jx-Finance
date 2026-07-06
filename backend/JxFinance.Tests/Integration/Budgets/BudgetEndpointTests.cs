using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Budgets;

[Collection(IntegrationCollection.Name)]
public sealed class BudgetEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Create_budget_tracks_this_months_spend_including_split_lines()
    {
        var accountResponse = await Client.PostAsJsonAsync(
            "/api/accounts",
            new { name = $"Budget test {Guid.NewGuid():N}", type = "cash", startingBalance = "1000.00" });
        var account = await accountResponse.Content.ReadFromJsonAsync<AccountDto>();

        var categoryResponse = await Client.PostAsJsonAsync(
            "/api/categories",
            new { name = $"Budget Food {Guid.NewGuid():N}", type = "expense" });
        var category = await categoryResponse.Content.ReadFromJsonAsync<CategoryDto>();

        var createResponse = await Client.PostAsJsonAsync(
            "/api/budgets",
            new { categoryId = category!.Id, limitAmount = "200.00" });
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var budget = await createResponse.Content.ReadFromJsonAsync<BudgetDto>();
        Assert.Equal("200.00", budget!.LimitAmount);

        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
        await Client.PostAsJsonAsync(
            "/api/transactions",
            new { accountId = account!.Id, categoryId = category.Id, type = "expense", amount = "30.00", date = today });
        await Client.PostAsJsonAsync(
            "/api/transactions",
            new
            {
                accountId = account.Id,
                type = "expense",
                amount = "20.00",
                date = today,
                lines = new object[] { new { categoryId = category.Id, amount = "20.00" } },
            });

        var budgets = await Client.GetFromJsonAsync<List<BudgetDto>>("/api/budgets");
        var updated = budgets!.Single(b => b.Id == budget.Id);
        Assert.Equal("50.00", updated.Spent);
        Assert.Equal("150.00", updated.Remaining);

        var deleteResponse = await Client.DeleteAsync($"/api/budgets/{budget.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
    }

    [Fact]
    public async Task Create_rejects_a_budget_on_an_income_category()
    {
        var categoryResponse = await Client.PostAsJsonAsync(
            "/api/categories",
            new { name = $"Budget Income {Guid.NewGuid():N}", type = "income" });
        var category = await categoryResponse.Content.ReadFromJsonAsync<CategoryDto>();

        var response = await Client.PostAsJsonAsync(
            "/api/budgets",
            new { categoryId = category!.Id, limitAmount = "100.00" });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private sealed record AccountDto(Guid Id);

    private sealed record CategoryDto(Guid Id);

    private sealed record BudgetDto(Guid Id, string LimitAmount, string Spent, string Remaining);
}
