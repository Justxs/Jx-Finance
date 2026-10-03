using System.Globalization;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Reports;

[Collection<ReportsCollection>]
public sealed class MyShareTests(ReportsFixture fixture) : IntegrationTestBase(fixture)
{
    private const string September = "dateFrom=2026-09-01&dateTo=2026-09-30";

    [Fact]
    public async Task The_payer_counts_their_own_part_of_a_household_split_and_of_a_split_with_people()
    {
        using var pair = await CreateHouseholdPairAsync();
        var account = await CreateAccountAsync("1000.00", client: pair.OwnerClient);
        var groceries = await CreateCategoryAsync(client: pair.OwnerClient);
        var dining = await CreateCategoryAsync(client: pair.OwnerClient);
        var market = await ExpenseAsync(pair.OwnerClient, account, groceries, "90.00", "Maxima");
        var dinner = await ExpenseAsync(pair.OwnerClient, account, dining, "60.00", "Dinner");
        await CreateTransactionAsync(pair.OwnerClient, account, groceries, "expense", "10.00", "2026-09-11", "Kiosk");
        await SplitAsync(pair.OwnerClient, pair.HouseholdId, market, Share(pair.Owner.Id), Share(pair.Partner.Id));
        var jonas = (await PostAsync<IdDto>(pair.OwnerClient, "/api/contacts", new { name = "Jonas" })).Id;
        (await pair.OwnerClient.PostAsJsonAsync(
            "/api/contacts/splits",
            new { transactionId = dinner, method = "equal", own = new { }, shares = new[] { new { contactId = jonas } } },
            TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        var full = await ReportAsync(pair.OwnerClient, September);
        var mine = await ReportAsync(pair.OwnerClient, $"{September}&share=mine");

        Assert.Equal(("160.00", "85.00"), (full.TotalExpense, mine.TotalExpense));
        Assert.Equal(("55.00", "30.00"), (Amount(mine, groceries), Amount(mine, dining)));
        Assert.Equal(Parse(mine.TotalExpense), mine.ExpenseByCategory.Sum(c => Parse(c.Amount)));
    }

    [Fact]
    public async Task A_payer_who_left_themselves_out_counts_nothing()
    {
        using var pair = await CreateHouseholdPairAsync();
        var account = await CreateAccountAsync("1000.00", client: pair.OwnerClient);
        var gift = await ExpenseAsync(pair.OwnerClient, account, null, "90.00", "Gift");
        await SplitAsync(pair.OwnerClient, pair.HouseholdId, gift, "exact", new { userId = pair.Partner.Id, amount = "90.00" });

        Assert.Equal("0.00", (await ReportAsync(pair.OwnerClient, $"{September}&share=mine")).TotalExpense);
    }

    [Fact]
    public async Task A_housemate_counts_their_share_in_place_of_a_visible_row_and_on_the_split_date_for_an_invisible_one()
    {
        using var pair = await CreateHouseholdPairAsync();
        var shared = await CreateAccountAsync("1000.00", householdId: pair.HouseholdId, client: pair.OwnerClient);
        var personal = await CreateAccountAsync("1000.00", client: pair.OwnerClient);
        var ownCategory = await CreateCategoryAsync(client: pair.OwnerClient);
        var sharedCategory = (await PostAsync<IdDto>(
            pair.OwnerClient,
            "/api/categories",
            new { name = $"Home {Guid.NewGuid():N}", type = "expense", scope = "shared", householdId = pair.HouseholdId })).Id;
        var onShared = await ExpenseAsync(pair.OwnerClient, shared, ownCategory, "40.00", "Hardware");
        var privateOwn = await ExpenseAsync(pair.OwnerClient, personal, ownCategory, "90.00", "Groceries");
        var privateShared = await ExpenseAsync(pair.OwnerClient, personal, sharedCategory, "30.00", "Cleaning");
        foreach (var id in new[] { onShared, privateOwn, privateShared })
        {
            await SplitAsync(pair.OwnerClient, pair.HouseholdId, id, Share(pair.Owner.Id), Share(pair.Partner.Id));
        }

        var full = await ReportAsync(pair.PartnerClient, September);
        var mine = await ReportAsync(pair.PartnerClient, $"{September}&share=mine");

        Assert.Equal("40.00", full.TotalExpense);
        Assert.Equal("80.00", mine.TotalExpense);
        Assert.Equal("15.00", Amount(mine, sharedCategory));
        Assert.Equal("45.00", Amount(mine, null));
        Assert.Equal("20.00", Amount(mine, ownCategory));
    }

    [Fact]
    public async Task A_spread_split_counts_its_share_in_each_month_and_another_currency_at_its_own_rate()
    {
        using var pair = await CreateHouseholdPairAsync();
        var euros = await CreateAccountAsync("1000.00", client: pair.OwnerClient);
        var dollars = await CreateAccountAsync("1000.00", currency: "usd", client: pair.OwnerClient);
        var insurance = (await RecordTransactionAsync(pair.OwnerClient, new { accountId = euros, type = "expense", amount = "90.00", date = "2026-07-10", spreadMonths = 3 })).Id;
        var trip = await ExpenseAsync(pair.OwnerClient, dollars, null, "110.00", "Trip");
        await SplitAsync(pair.OwnerClient, pair.HouseholdId, insurance, Share(pair.Owner.Id), Share(pair.Partner.Id));
        await SplitAsync(pair.OwnerClient, pair.HouseholdId, trip, Share(pair.Owner.Id), Share(pair.Partner.Id));

        var august = await ReportAsync(pair.OwnerClient, "dateFrom=2026-08-01&dateTo=2026-08-31&share=mine");
        var september = await ReportAsync(pair.OwnerClient, $"{September}&share=mine");

        Assert.Equal("15.00", august.TotalExpense);
        Assert.Equal("65.00", september.TotalExpense);
    }

    [Fact]
    public async Task A_deleted_split_transaction_counts_for_nobody()
    {
        using var pair = await CreateHouseholdPairAsync();
        var account = await CreateAccountAsync("1000.00", client: pair.OwnerClient);
        var market = await ExpenseAsync(pair.OwnerClient, account, null, "90.00", "Maxima");
        await SplitAsync(pair.OwnerClient, pair.HouseholdId, market, Share(pair.Owner.Id), Share(pair.Partner.Id));
        Assert.Equal("45.00", (await ReportAsync(pair.PartnerClient, $"{September}&share=mine")).TotalExpense);

        (await pair.OwnerClient.DeleteAsync($"/api/transactions/{market}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        Assert.Equal("0.00", (await ReportAsync(pair.PartnerClient, $"{September}&share=mine")).TotalExpense);
        Assert.Equal("0.00", (await ReportAsync(pair.OwnerClient, $"{September}&share=mine")).TotalExpense);
    }

    [Fact]
    public async Task The_active_household_counts_only_the_shares_of_its_own_splits()
    {
        using var pair = await CreateHouseholdPairAsync();
        var sibling = await CreateUserAsync();
        using var siblingClient = await LoginAsync(sibling);
        var other = await CreateHouseholdAsync(pair.Partner, sibling);
        var ownerAccount = await CreateAccountAsync("1000.00", client: pair.OwnerClient);
        var siblingAccount = await CreateAccountAsync("1000.00", client: siblingClient);
        await SplitAsync(pair.OwnerClient, pair.HouseholdId, await ExpenseAsync(pair.OwnerClient, ownerAccount, null, "90.00", "Groceries"), Share(pair.Owner.Id), Share(pair.Partner.Id));
        await SplitAsync(siblingClient, other, await ExpenseAsync(siblingClient, siblingAccount, null, "40.00", "Cinema"), Share(sibling.Id), Share(pair.Partner.Id));

        var everything = await ReportAsync(pair.PartnerClient, $"{September}&share=mine");
        var first = await GetScopedAsync<ReportDto>(pair.PartnerClient, $"/api/reports/summary?{September}&share=mine", pair.HouseholdId);
        var second = await GetScopedAsync<ReportDto>(pair.PartnerClient, $"/api/reports/summary?{September}&share=mine", other);

        Assert.Equal(("65.00", "45.00", "20.00"), (everything.TotalExpense, first.TotalExpense, second.TotalExpense));
    }

    [Fact]
    public async Task A_personal_budget_counts_my_share_and_a_household_budget_keeps_the_households_figure()
    {
        using var pair = await CreateHouseholdPairAsync();
        var shared = await CreateAccountAsync("1000.00", householdId: pair.HouseholdId, client: pair.OwnerClient);
        var home = (await PostAsync<IdDto>(
            pair.OwnerClient,
            "/api/categories",
            new { name = $"Home {Guid.NewGuid():N}", type = "expense", scope = "shared", householdId = pair.HouseholdId })).Id;
        var row = await ExpenseAsync(pair.OwnerClient, shared, home, "80.00", "Furniture");
        await SplitAsync(pair.OwnerClient, pair.HouseholdId, row, Share(pair.Owner.Id), Share(pair.Partner.Id));
        var personal = await PostAsync<IdDto>(pair.OwnerClient, "/api/budgets", new { categoryId = home, limitAmount = "100.00", period = "monthly" });
        var household = await PostAsync<IdDto>(
            pair.OwnerClient,
            "/api/budgets",
            new { categoryId = home, limitAmount = "100.00", period = "monthly", scope = "shared", householdId = pair.HouseholdId });

        var full = await BudgetsAsync(pair.OwnerClient, "");
        var mine = await BudgetsAsync(pair.OwnerClient, "&share=mine");

        Assert.Equal(("80.00", "40.00"), (Spent(full, personal.Id), Spent(mine, personal.Id)));
        Assert.Equal(("80.00", "80.00"), (Spent(full, household.Id), Spent(mine, household.Id)));
    }

    private static object Share(Guid userId) => new { userId };

    private static async Task<Guid> ExpenseAsync(HttpClient client, Guid account, Guid? category, string amount, string description) =>
        (await CreateTransactionAsync(client, account, category, "expense", amount, "2026-09-10", description)).Id;

    private static Task SplitAsync(HttpClient client, Guid household, Guid transactionId, params object[] shares) =>
        SplitAsync(client, household, transactionId, "equal", shares);

    private static Task SplitAsync(HttpClient client, Guid household, Guid transactionId, string method, params object[] shares) =>
        PostAsync<IdDto>(client, $"/api/households/{household}/shared-expenses", new { transactionId, method, shares });

    private static async Task<ReportDto> ReportAsync(HttpClient client, string query) =>
        (await client.GetFromJsonAsync<ReportDto>($"/api/reports/summary?{query}", TestContext.Current.CancellationToken))!;

    private static async Task<List<BudgetDto>> BudgetsAsync(HttpClient client, string query) =>
        (await client.GetFromJsonAsync<List<BudgetDto>>($"/api/budgets?asOf=2026-09-15{query}", TestContext.Current.CancellationToken))!;

    private static string Spent(List<BudgetDto> budgets, Guid id) => budgets.Single(b => b.Id == id).Spent;

    private static string Amount(ReportDto report, Guid? categoryId) => Assert.Single(report.ExpenseByCategory, c => c.CategoryId == categoryId).Amount;

    private static decimal Parse(string value) => decimal.Parse(value, CultureInfo.InvariantCulture);

    private sealed record CategoryDto(Guid? CategoryId, string Amount);

    private sealed record ReportDto(string TotalExpense, List<CategoryDto> ExpenseByCategory);

    private sealed record BudgetDto(Guid Id, string Spent);
}
