using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Categories;

[Collection<IntegrationCollection>]
public sealed class CategoryGroupTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task A_parent_rolls_up_its_sub_categories_in_the_ledger_a_budget_and_the_report()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var transport = await CategoryAsync(member, "Transport");
        var fuel = await CategoryAsync(member, "Fuel", transport.Id);
        var parking = await CategoryAsync(member, "Parking", transport.Id);
        var food = await CategoryAsync(member, "Food");
        await CreateTransactionAsync(member, account, fuel.Id, "expense", "60.00", Today.ToString("yyyy-MM-dd"), "Circle K");
        await CreateTransactionAsync(member, account, parking.Id, "expense", "5.00", Today.ToString("yyyy-MM-dd"), "Parking");
        await CreateTransactionAsync(member, account, transport.Id, "expense", "2.00", Today.ToString("yyyy-MM-dd"), "Bus");
        await CreateTransactionAsync(member, account, food.Id, "expense", "30.00", Today.ToString("yyyy-MM-dd"), "Rimi");
        var budget = await PostAsync<BudgetDto>(member, "/api/budgets", new { categoryId = transport.Id, limitAmount = "100.00" });

        var ledger = (await member.GetFromJsonAsync<PageDto<TransactionDto>>($"/api/transactions?categoryId={transport.Id}", TestContext.Current.CancellationToken))!;
        var budgets = await member.GetFromJsonAsync<List<BudgetDto>>("/api/budgets", TestContext.Current.CancellationToken);
        var monthStart = new DateOnly(Today.Year, Today.Month, 1);
        var report = (await member.GetFromJsonAsync<ReportDto>($"/api/reports/summary?dateFrom={monthStart:yyyy-MM-dd}&dateTo={Today:yyyy-MM-dd}", TestContext.Current.CancellationToken))!;

        Assert.Equal(transport.Id, fuel.ParentId);
        Assert.Equal(3, ledger.Total);
        Assert.Equal("67.00", budgets!.Single(b => b.Id == budget.Id).Spent);
        Assert.Equal(transport.Id, report.ExpenseByCategory.Single(i => i.CategoryId == fuel.Id).ParentId);
        Assert.Null(report.ExpenseByCategory.Single(i => i.CategoryId == transport.Id).ParentId);
    }

    [Fact]
    public async Task Nesting_stays_one_level_deep_and_within_one_flow_type()
    {
        using var member = await CreateUserClientAsync();
        var transport = await CategoryAsync(member, "Transport");
        var fuel = await CategoryAsync(member, "Fuel", transport.Id);
        var salary = await CategoryAsync(member, "Salary", type: "income");

        var deeper = await member.PostAsJsonAsync("/api/categories", Body("Diesel", fuel.Id), TestContext.Current.CancellationToken);
        var otherType = await member.PostAsJsonAsync("/api/categories", Body("Bonus", transport.Id, "income"), TestContext.Current.CancellationToken);
        var parentUnderChild = await member.PutAsJsonAsync($"/api/categories/{transport.Id}", Update("Transport", salary.Id), TestContext.Current.CancellationToken);
        var ownParent = await member.PutAsJsonAsync($"/api/categories/{transport.Id}", Update("Transport", transport.Id), TestContext.Current.CancellationToken);

        await AssertProblemAsync(deeper, HttpStatusCode.BadRequest, "category.nestingInvalid");
        await AssertProblemAsync(otherType, HttpStatusCode.BadRequest, "category.wrongType");
        await AssertProblemAsync(parentUnderChild, HttpStatusCode.BadRequest, "category.wrongType");
        await AssertProblemAsync(ownParent, HttpStatusCode.BadRequest, "category.nestingInvalid");
    }

    [Fact]
    public async Task Deleting_a_parent_makes_its_children_top_level_and_a_restore_groups_them_again()
    {
        using var member = await CreateUserClientAsync();
        var transport = await CategoryAsync(member, "Transport");
        var fuel = await CategoryAsync(member, "Fuel", transport.Id);

        await member.DeleteAsync($"/api/categories/{transport.Id}", TestContext.Current.CancellationToken);
        var afterDelete = await CategoriesAsync(member);
        await member.PostAsJsonAsync("/api/trash/restore", new { kind = "category", entityId = transport.Id }, TestContext.Current.CancellationToken);
        var afterRestore = await CategoriesAsync(member);

        Assert.Null(afterDelete.Single(c => c.Id == fuel.Id).ParentId);
        Assert.Equal(transport.Id, afterRestore.Single(c => c.Id == fuel.Id).ParentId);
    }

    private static object Body(string name, Guid? parentId = null, string type = "expense") =>
        new { name, type, scope = "personal", parentId };

    private static object Update(string name, Guid? parentId) => new { name, scope = "personal", parentId };

    private static Task<GroupedCategoryDto> CategoryAsync(HttpClient client, string name, Guid? parentId = null, string type = "expense") =>
        PostAsync<GroupedCategoryDto>(client, "/api/categories", Body(name, parentId, type));

    private static async Task<List<GroupedCategoryDto>> CategoriesAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<List<GroupedCategoryDto>>("/api/categories", TestContext.Current.CancellationToken))!;

    private sealed record GroupedCategoryDto(Guid Id, string Name, Guid? ParentId);

    private sealed record BreakdownItemDto(Guid? CategoryId, Guid? ParentId);

    private sealed record ReportDto(List<BreakdownItemDto> ExpenseByCategory);
}
