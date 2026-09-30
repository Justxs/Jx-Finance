using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Households;

[Collection<IntegrationCollection>]
public sealed class SharedPlanTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const string AsOf = "2026-07-15";

    [Fact]
    public async Task A_shared_budget_counts_the_household_accounts_for_every_member()
    {
        using var pair = await CreateHouseholdPairAsync();
        var sharedAccount = await CreateAccountAsync(householdId: pair.HouseholdId, client: pair.OwnerClient);
        var personalAccount = await CreateAccountAsync(client: pair.OwnerClient);
        var category = await SharedCategoryAsync(pair);
        await CreateTransactionAsync(pair.PartnerClient, sharedAccount, category, "expense", "40.00", "2026-07-10");
        await CreateTransactionAsync(pair.OwnerClient, personalAccount, category, "expense", "25.00", "2026-07-11");

        var budget = await PostAsync<IdDto>(
            pair.OwnerClient,
            "/api/budgets",
            new { categoryId = category, limitAmount = "300.00", period = "monthly", scope = "shared", householdId = pair.HouseholdId });
        var seenByPartner = Assert.Single(await BudgetsAsync(pair.PartnerClient), b => b.Id == budget.Id);
        var seenByOwner = Assert.Single(await BudgetsAsync(pair.OwnerClient), b => b.Id == budget.Id);

        Assert.Equal("40.00", seenByPartner.Spent);
        Assert.Equal("40.00", seenByOwner.Spent);
        Assert.Equal("shared", seenByPartner.Scope);
    }

    [Fact]
    public async Task A_member_edits_a_shared_budget_but_only_its_owner_deletes_or_unshares_it()
    {
        using var pair = await CreateHouseholdPairAsync();
        var category = await SharedCategoryAsync(pair);
        var budget = await PostAsync<IdDto>(
            pair.OwnerClient,
            "/api/budgets",
            new { categoryId = category, limitAmount = "300.00", period = "monthly", scope = "shared", householdId = pair.HouseholdId });

        var edited = await pair.PartnerClient.PutAsJsonAsync(
            $"/api/budgets/{budget.Id}",
            new { categoryId = category, limitAmount = "350.00", period = "monthly", scope = "shared", householdId = pair.HouseholdId },
            TestContext.Current.CancellationToken);
        var unshared = await pair.PartnerClient.PutAsJsonAsync(
            $"/api/budgets/{budget.Id}",
            new { categoryId = category, limitAmount = "350.00", period = "monthly", scope = "personal" },
            TestContext.Current.CancellationToken);
        var deleted = await pair.PartnerClient.DeleteAsync($"/api/budgets/{budget.Id}", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, edited.StatusCode);
        await AssertProblemAsync(unshared, HttpStatusCode.Forbidden, "access.forbidden");
        await AssertProblemAsync(deleted, HttpStatusCode.Forbidden, "access.forbidden");
    }

    [Fact]
    public async Task A_shared_plan_that_points_at_a_personal_record_is_refused()
    {
        using var pair = await CreateHouseholdPairAsync();
        var personalCategory = await CreateCategoryAsync(client: pair.OwnerClient);
        var personalAccount = await CreateAccountAsync(client: pair.OwnerClient);

        var budget = await pair.OwnerClient.PostAsJsonAsync(
            "/api/budgets",
            new { categoryId = personalCategory, limitAmount = "100.00", period = "monthly", scope = "shared", householdId = pair.HouseholdId },
            TestContext.Current.CancellationToken);
        var goal = await pair.OwnerClient.PostAsJsonAsync(
            "/api/goals",
            new { name = "Car", targetAmount = "5000.00", funding = "account", fundingAccountId = personalAccount, scope = "shared", householdId = pair.HouseholdId },
            TestContext.Current.CancellationToken);
        var bill = await pair.OwnerClient.PostAsJsonAsync(
            "/api/recurring-bills",
            new
            {
                name = "Rent",
                shape = "expense",
                kind = "fixed",
                amount = "700.00",
                accountId = personalAccount,
                cadence = "monthly",
                nextDueDate = "2026-08-01",
                remindDaysBefore = 3,
                scope = "shared",
                householdId = pair.HouseholdId,
            },
            TestContext.Current.CancellationToken);

        await AssertProblemAsync(budget, HttpStatusCode.BadRequest, "household.referenceNotShared");
        await AssertProblemAsync(goal, HttpStatusCode.BadRequest, "household.referenceNotShared");
        await AssertProblemAsync(bill, HttpStatusCode.BadRequest, "household.referenceNotShared");
    }

    [Fact]
    public async Task Shared_goals_and_recurring_entries_reach_the_partner_until_the_household_is_deleted()
    {
        using var pair = await CreateHouseholdPairAsync();
        var sharedAccount = await CreateAccountAsync(householdId: pair.HouseholdId, client: pair.OwnerClient);
        var goal = await PostAsync<IdDto>(
            pair.OwnerClient,
            "/api/goals",
            new { name = "Holiday", targetAmount = "2000.00", currentAmount = "300.00", funding = "manual", scope = "shared", householdId = pair.HouseholdId });
        var bill = await PostAsync<IdDto>(
            pair.OwnerClient,
            "/api/recurring-bills",
            new
            {
                name = "Rent",
                shape = "expense",
                kind = "fixed",
                amount = "700.00",
                accountId = sharedAccount,
                cadence = "monthly",
                nextDueDate = "2026-08-01",
                remindDaysBefore = 3,
                scope = "shared",
                householdId = pair.HouseholdId,
            });

        var goalsBefore = await pair.PartnerClient.GetFromJsonAsync<List<IdDto>>("/api/goals", TestContext.Current.CancellationToken);
        var billsBefore = await pair.PartnerClient.GetFromJsonAsync<List<IdDto>>("/api/recurring-bills", TestContext.Current.CancellationToken);
        (await pair.OwnerClient.DeleteAsync($"/api/households/{pair.HouseholdId}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var goalsAfter = await pair.PartnerClient.GetFromJsonAsync<List<IdDto>>("/api/goals", TestContext.Current.CancellationToken);
        var ownerGoals = await pair.OwnerClient.GetFromJsonAsync<List<IdDto>>("/api/goals", TestContext.Current.CancellationToken);

        Assert.Contains(goalsBefore!, g => g.Id == goal.Id);
        Assert.Contains(billsBefore!, b => b.Id == bill.Id);
        Assert.DoesNotContain(goalsAfter!, g => g.Id == goal.Id);
        Assert.Contains(ownerGoals!, g => g.Id == goal.Id);
    }

    private static async Task<Guid> SharedCategoryAsync(HouseholdPair pair) =>
        (await PostAsync<IdDto>(
            pair.OwnerClient,
            "/api/categories",
            new { name = $"Groceries {Guid.NewGuid():N}", type = "expense", scope = "shared", householdId = pair.HouseholdId })).Id;

    private static async Task<List<SharedBudgetDto>> BudgetsAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<List<SharedBudgetDto>>($"/api/budgets?asOf={AsOf}", TestContext.Current.CancellationToken))!;

    private sealed record SharedBudgetDto(Guid Id, string Spent, string Scope);
}
