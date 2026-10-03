using System.Net.Http.Json;
using JxFinance.Domain.Common;
using JxFinance.Tests.Support;
using Microsoft.Extensions.DependencyInjection;

namespace JxFinance.Tests.Integration.Budgets;

[Collection<NetWorthCollection>]
public sealed class SpreadBudgetTests(NetWorthFixture fixture) : IntegrationTestBase(fixture)
{
    private const string AsOf = "2026-07-15";

    [Fact]
    public async Task Monthly_category_and_tag_budgets_count_one_slice()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("5000.00", client: member);
        var insurance = await CreateCategoryAsync(client: member);
        var car = await CreateTagAsync(client: member);
        await RecordTransactionAsync(member, new
        {
            accountId = account,
            categoryId = insurance,
            type = "expense",
            amount = "1200.00",
            date = "2026-03-01",
            tagIds = new[] { car },
            spreadMonths = 12,
        });
        await CreateTransactionAsync(member, account, insurance, "expense", "25.00", "2026-07-02");
        var byCategory = await PostAsync<IdDto>(member, "/api/budgets", new { categoryId = insurance, limitAmount = "150.00", period = "monthly" });
        var byTag = await PostAsync<IdDto>(member, "/api/budgets", new { tagId = car, limitAmount = "150.00", period = "monthly" });

        var budgets = await BudgetsAsync(member);

        Assert.Equal("125.00", budgets.Single(b => b.Id == byCategory.Id).Spent);
        Assert.Equal("100.00", budgets.Single(b => b.Id == byTag.Id).Spent);
    }

    [Fact]
    public async Task A_rollover_budget_carries_what_each_slice_left()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("5000.00", client: member);
        var insurance = await CreateCategoryAsync(client: member);
        await RecordTransactionAsync(member, new
        {
            accountId = account,
            categoryId = insurance,
            type = "expense",
            amount = "300.00",
            date = "2026-05-10",
            spreadMonths = 3,
        });
        var budget = await PostAsync<IdDto>(
            member,
            "/api/budgets",
            new { categoryId = insurance, limitAmount = "150.00", period = "monthly", rolloverEnabled = true });
        await SqlAsync($"""UPDATE "Budgets" SET "CreatedAt" = {Services.GetRequiredService<IClock>().StartOfDay(new DateOnly(2026, 5, 1))} WHERE "Id" = {budget.Id}""");

        var read = (await BudgetsAsync(member)).Single(b => b.Id == budget.Id);

        Assert.Equal(("100.00", "250.00", "100.00", "150.00"), (read.CarriedAmount, read.EffectiveLimit, read.Spent, read.Remaining));
    }

    [Fact]
    public async Task A_shared_budget_counts_a_housemates_spread_row_on_a_shared_account()
    {
        using var pair = await CreateHouseholdPairAsync();
        var shared = await CreateAccountAsync(householdId: pair.HouseholdId, client: pair.OwnerClient);
        var category = (await PostAsync<IdDto>(
            pair.OwnerClient,
            "/api/categories",
            new { name = $"Home insurance {Guid.NewGuid():N}", type = "expense", scope = "shared", householdId = pair.HouseholdId })).Id;
        await RecordTransactionAsync(pair.PartnerClient, new
        {
            accountId = shared,
            categoryId = category,
            type = "expense",
            amount = "600.00",
            date = "2026-06-10",
            spreadMonths = 6,
        });

        var budget = await PostAsync<IdDto>(
            pair.OwnerClient,
            "/api/budgets",
            new { categoryId = category, limitAmount = "300.00", period = "monthly", scope = "shared", householdId = pair.HouseholdId });

        Assert.Equal("100.00", (await BudgetsAsync(pair.OwnerClient)).Single(b => b.Id == budget.Id).Spent);
        Assert.Equal("100.00", (await BudgetsAsync(pair.PartnerClient)).Single(b => b.Id == budget.Id).Spent);
    }

    [Fact]
    public async Task Backward_split_and_refund_spreads_count_their_slice_of_the_month()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("5000.00", client: member);
        var water = await CreateCategoryAsync(client: member);
        var food = await CreateCategoryAsync(client: member);
        var home = await CreateCategoryAsync(client: member);
        await RecordTransactionAsync(member, new { accountId = account, categoryId = water, type = "expense", amount = "90.00", date = "2026-08-10", spreadMonths = 3, spreadDirection = "backward" });
        await RecordTransactionAsync(member, new { accountId = account, categoryId = water, type = "expense", amount = "90.00", date = "2026-08-10", spreadMonths = 3 });
        await RecordTransactionAsync(member, new
        {
            accountId = account,
            type = "expense",
            amount = "60.00",
            date = "2026-06-01",
            spreadMonths = 3,
            lines = new object[] { new { categoryId = food, amount = "45.00" }, new { categoryId = home, amount = "15.00" } },
        });
        await RecordTransactionAsync(member, new { accountId = account, categoryId = food, type = "expense", amount = "-30.00", date = "2026-07-01", spreadMonths = 3 });
        var forWater = await PostAsync<IdDto>(member, "/api/budgets", new { categoryId = water, limitAmount = "100.00", period = "monthly" });
        var forFood = await PostAsync<IdDto>(member, "/api/budgets", new { categoryId = food, limitAmount = "100.00", period = "monthly" });
        var forHome = await PostAsync<IdDto>(member, "/api/budgets", new { categoryId = home, limitAmount = "100.00", period = "monthly" });

        var budgets = await BudgetsAsync(member);

        Assert.Equal("30.00", budgets.Single(b => b.Id == forWater.Id).Spent);
        Assert.Equal("5.00", budgets.Single(b => b.Id == forFood.Id).Spent);
        Assert.Equal("5.00", budgets.Single(b => b.Id == forHome.Id).Spent);
    }

    private static async Task<List<SpreadBudgetDto>> BudgetsAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<List<SpreadBudgetDto>>($"/api/budgets?asOf={AsOf}", TestContext.Current.CancellationToken))!;

    private sealed record SpreadBudgetDto(Guid Id, string Spent, string CarriedAmount, string EffectiveLimit, string Remaining);
}
