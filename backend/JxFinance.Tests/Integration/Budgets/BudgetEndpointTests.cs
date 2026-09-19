using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Budgets;

[Collection<IntegrationCollection>]
public sealed class BudgetEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Create_budget_tracks_this_months_spend_including_split_lines()
    {
        var account = await CreateAccountAsync("1000.00");
        var category = await CreateCategoryAsync();

        var createResponse = await Client.PostAsJsonAsync(
            "/api/budgets",
            new { categoryId = category, limitAmount = "200.00" });
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var budget = await createResponse.Content.ReadFromJsonAsync<BudgetDto>();
        Assert.Equal("200.00", budget!.LimitAmount);

        await PostAsync<IdDto>(
            Client,
            "/api/transactions",
            new { accountId = account, categoryId = category, type = "expense", amount = "30.00", date = Today });
        await PostAsync<IdDto>(
            Client,
            "/api/transactions",
            new
            {
                accountId = account,
                type = "expense",
                amount = "20.00",
                date = Today,
                lines = new object[] { new { categoryId = category, amount = "20.00" } },
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
        var category = await CreateCategoryAsync("income");

        var response = await Client.PostAsJsonAsync(
            "/api/budgets",
            new { categoryId = category, limitAmount = "100.00" });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Update_changes_the_limit_and_the_tracked_category()
    {
        var budget = await PostAsync<BudgetDto>(Client, "/api/budgets", new { categoryId = await CreateCategoryAsync(), limitAmount = "200.00" });
        var otherCategory = await CreateCategoryAsync();

        var response = await Client.PutAsJsonAsync($"/api/budgets/{budget.Id}", new { categoryId = otherCategory, limitAmount = "350.00" });

        response.EnsureSuccessStatusCode();
        var updated = await response.Content.ReadFromJsonAsync<BudgetDto>();
        Assert.Equal((otherCategory, "350.00", "350.00"), (updated!.CategoryId, updated.LimitAmount, updated.Remaining));
    }

    [Fact]
    public async Task Updating_or_deleting_an_unknown_budget_answers_not_found()
    {
        var update = await Client.PutAsJsonAsync($"/api/budgets/{Guid.NewGuid()}", new { categoryId = await CreateCategoryAsync(), limitAmount = "1.00" });
        var delete = await Client.DeleteAsync($"/api/budgets/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, update.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, delete.StatusCode);
    }

    private sealed record BudgetDto(Guid Id, Guid CategoryId, string LimitAmount, string Spent, string Remaining);
}
