using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Households;

[Collection<PeopleCollection>]
public sealed class RecordOwnershipTests(PeopleFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Every_shared_record_is_mine_for_its_owner_and_not_for_another_member()
    {
        using var pair = await CreateHouseholdPairAsync();
        var records = await SharedRecordsAsync(pair);

        foreach (var (url, id) in records)
        {
            var ownerSees = Assert.Single(await ListAsync(pair.OwnerClient, url), r => r.Id == id);
            var partnerSees = Assert.Single(await ListAsync(pair.PartnerClient, url), r => r.Id == id);

            Assert.True(ownerSees.IsMine, url);
            Assert.False(partnerSees.IsMine, url);
        }
    }

    [Fact]
    public async Task A_shared_group_in_the_ledger_is_mine_only_for_its_owner()
    {
        using var pair = await CreateHouseholdPairAsync();
        var account = await CreateAccountAsync(householdId: pair.HouseholdId, client: pair.OwnerClient);
        var hotel = await CreateTransactionAsync(pair.OwnerClient, account, null, "expense", "40.00", "2026-07-03", "Hotel");
        await PostAsync<IdDto>(pair.OwnerClient, "/api/transaction-groups", new { name = "Trip", transactionIds = new[] { hotel.Id }, scope = "shared", householdId = pair.HouseholdId });

        Assert.True((await LedgerGroupAsync(pair.OwnerClient, account)).IsMine);
        Assert.False((await LedgerGroupAsync(pair.PartnerClient, account)).IsMine);
    }

    private async Task<List<(string Url, Guid Id)>> SharedRecordsAsync(HouseholdPair pair)
    {
        var household = pair.HouseholdId;
        var account = await CreateAccountAsync(householdId: household, client: pair.OwnerClient);
        var category = await PostAsync<IdDto>(pair.OwnerClient, "/api/categories", new { name = $"Food {Guid.NewGuid():N}", type = "expense", scope = "shared", householdId = household });
        var tag = await CreateTagAsync(householdId: household, client: pair.OwnerClient);
        var budget = await PostAsync<IdDto>(pair.OwnerClient, "/api/budgets", new { categoryId = category.Id, limitAmount = "300.00", period = "monthly", scope = "shared", householdId = household });
        var goal = await PostAsync<IdDto>(pair.OwnerClient, "/api/goals", new { name = "Holiday", targetAmount = "2000.00", currentAmount = "0.00", funding = "manual", scope = "shared", householdId = household });
        var bill = await PostAsync<IdDto>(
            pair.OwnerClient,
            "/api/recurring-bills",
            new { name = "Rent", shape = "expense", kind = "fixed", amount = "700.00", accountId = account, cadence = "monthly", nextDueDate = "2026-08-01", remindDaysBefore = 3, scope = "shared", householdId = household });
        var asset = await PostAsync<IdDto>(pair.OwnerClient, "/api/assets", new { name = "Car", type = "vehicle", currentValue = "9000.00", asOf = "2026-05-01", scope = "shared", householdId = household });
        var debt = await PostAsync<IdDto>(pair.OwnerClient, "/api/debts", new { name = "Mortgage", type = "mortgage", outstandingAmount = "1000.00", asOf = "2026-05-01", scope = "shared", householdId = household });
        var hotel = await CreateTransactionAsync(pair.OwnerClient, account, null, "expense", "40.00", "2026-07-03", "Hotel");
        var group = await PostAsync<IdDto>(pair.OwnerClient, "/api/transaction-groups", new { name = "Trip", transactionIds = new[] { hotel.Id }, scope = "shared", householdId = household });

        return
        [
            ("/api/accounts", account),
            ("/api/categories", category.Id),
            ("/api/tags", tag),
            ("/api/budgets", budget.Id),
            ("/api/goals", goal.Id),
            ("/api/recurring-bills", bill.Id),
            ("/api/assets", asset.Id),
            ("/api/debts", debt.Id),
            ("/api/transaction-groups", group.Id),
        ];
    }

    private static async Task<List<OwnedDto>> ListAsync(HttpClient client, string url) =>
        (await client.GetFromJsonAsync<List<OwnedDto>>(url, TestContext.Current.CancellationToken))!;

    private static async Task<OwnedDto> LedgerGroupAsync(HttpClient client, Guid account)
    {
        var page = await client.GetFromJsonAsync<PageDto<LedgerRowDto>>($"/api/transactions/ledger?accountId={account}", TestContext.Current.CancellationToken);
        return Assert.Single(page!.Items, i => i.Kind == "group").Group!;
    }

    private sealed record OwnedDto(Guid Id, bool IsMine);

    private sealed record LedgerRowDto(string Kind, OwnedDto? Group);
}
