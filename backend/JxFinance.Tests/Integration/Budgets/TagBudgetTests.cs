using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Budgets;

[Collection<NetWorthCollection>]
public sealed class TagBudgetTests(NetWorthFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task A_tag_budget_counts_whole_tagged_expenses_across_categories_and_refunds_lower_it()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("5000.00", client: member);
        var food = await CreateCategoryAsync(client: member);
        var travel = await CreateCategoryAsync(client: member);
        var holiday = await CreateTagAsync("Vacation 2026", client: member);

        var budget = await PostAsync<BudgetDto>(
            member,
            "/api/budgets",
            new { tagId = holiday, limitAmount = "2000.00", period = "yearly" });
        var hotel = await PostAsync<TransactionDto>(
            member,
            "/api/transactions",
            new { accountId = account, categoryId = travel, type = "expense", amount = "600.00", date = Today, tagIds = new[] { holiday } });
        await PostAsync<TransactionDto>(
            member,
            "/api/transactions",
            new { accountId = account, categoryId = food, type = "expense", amount = "80.00", date = Today, tagIds = new[] { holiday } });
        await PostAsync<TransactionDto>(
            member,
            "/api/transactions",
            new { accountId = account, categoryId = food, type = "expense", amount = "45.00", date = Today });
        await PostAsync<TransactionDto>(
            member,
            "/api/transactions",
            new { accountId = account, categoryId = travel, type = "expense", amount = "-100.00", date = Today, tagIds = new[] { holiday }, refundOfTransactionId = hotel.Id });

        var budgets = await member.GetFromJsonAsync<List<BudgetDto>>("/api/budgets", TestContext.Current.CancellationToken);
        var shown = budgets!.Single(b => b.Id == budget.Id);

        Assert.Equal((null, holiday, "Vacation 2026"), (budget.CategoryId, budget.TagId, budget.Name));
        Assert.Equal(("580.00", "1420.00"), (shown.Spent, shown.Remaining));
    }

    [Fact]
    public async Task A_budget_needs_exactly_one_of_a_category_and_a_tag_and_one_per_tag_and_period()
    {
        using var member = await CreateUserClientAsync();
        var food = await CreateCategoryAsync(client: member);
        var holiday = await CreateTagAsync(client: member);
        await PostAsync<BudgetDto>(member, "/api/budgets", new { tagId = holiday, limitAmount = "100.00" });

        var neither = await member.PostAsJsonAsync("/api/budgets", new { limitAmount = "100.00" }, TestContext.Current.CancellationToken);
        var both = await member.PostAsJsonAsync("/api/budgets", new { categoryId = food, tagId = holiday, limitAmount = "100.00" }, TestContext.Current.CancellationToken);
        var again = await member.PostAsJsonAsync("/api/budgets", new { tagId = holiday, limitAmount = "150.00" }, TestContext.Current.CancellationToken);
        var yearly = await member.PostAsJsonAsync("/api/budgets", new { tagId = holiday, limitAmount = "900.00", period = "yearly" }, TestContext.Current.CancellationToken);

        await AssertValidationErrorAsync(neither, "categoryId");
        await AssertValidationErrorAsync(both, "categoryId");
        Assert.Equal(HttpStatusCode.Conflict, again.StatusCode);
        Assert.Equal(HttpStatusCode.Created, yearly.StatusCode);
    }

    [Fact]
    public async Task Deleting_the_tag_retires_its_budgets_and_restoring_the_tag_brings_them_back()
    {
        using var member = await CreateUserClientAsync();
        var holiday = await CreateTagAsync(client: member);
        var budget = await PostAsync<BudgetDto>(member, "/api/budgets", new { tagId = holiday, limitAmount = "300.00" });

        await member.DeleteAsync($"/api/tags/{holiday}", TestContext.Current.CancellationToken);
        var afterDelete = await member.GetFromJsonAsync<List<BudgetDto>>("/api/budgets", TestContext.Current.CancellationToken);
        await member.PostAsJsonAsync("/api/trash/restore", new { kind = "tag", entityId = holiday }, TestContext.Current.CancellationToken);
        var afterRestore = await member.GetFromJsonAsync<List<BudgetDto>>("/api/budgets", TestContext.Current.CancellationToken);

        Assert.DoesNotContain(afterDelete!, b => b.Id == budget.Id);
        Assert.Contains(afterRestore!, b => b.Id == budget.Id);
    }
}
