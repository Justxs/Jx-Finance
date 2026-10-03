using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Households;

[Collection<PeopleCollection>]
public sealed class SharedWealthTests(PeopleFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task A_shared_asset_counts_in_full_in_both_members_net_worth()
    {
        using var pair = await CreateHouseholdPairAsync();
        var asset = await PostAsync<AssetDto>(pair.OwnerClient, "/api/assets", AssetBody("12000.00", pair.HouseholdId));

        var seenByPartner = Assert.Single(await AssetsAsync(pair.PartnerClient));

        Assert.Equal((asset.Id, "shared", pair.HouseholdId), (seenByPartner.Id, seenByPartner.Scope, seenByPartner.HouseholdId));
        Assert.Equal("12000.00", (await NetWorthAsync(pair.OwnerClient)).Assets);
        Assert.Equal("12000.00", (await NetWorthAsync(pair.PartnerClient)).Assets);
    }

    [Fact]
    public async Task A_member_edits_and_values_a_shared_asset_but_only_its_owner_deletes_or_unshares_it()
    {
        using var pair = await CreateHouseholdPairAsync();
        var asset = await PostAsync<AssetDto>(pair.OwnerClient, "/api/assets", AssetBody("12000.00", pair.HouseholdId));
        var url = $"/api/assets/{asset.Id}";
        var valuation = $"{url}/valuations/{Today.AddDays(-5):yyyy-MM-dd}";

        var edited = await pair.PartnerClient.PutAsJsonAsync(url, AssetBody("11500.00", pair.HouseholdId), TestContext.Current.CancellationToken);
        var valued = await pair.PartnerClient.PutAsJsonAsync(valuation, new { value = "11800.00" }, TestContext.Current.CancellationToken);
        var unvalued = await pair.PartnerClient.DeleteAsync(valuation, TestContext.Current.CancellationToken);
        var unshared = await pair.PartnerClient.PutAsJsonAsync(url, AssetBody("11500.00", null), TestContext.Current.CancellationToken);
        var deleted = await pair.PartnerClient.DeleteAsync(url, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, edited.StatusCode);
        Assert.Equal(HttpStatusCode.OK, valued.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, unvalued.StatusCode);
        await AssertProblemAsync(unshared, HttpStatusCode.Forbidden, "access.forbidden");
        await AssertProblemAsync(deleted, HttpStatusCode.Forbidden, "access.forbidden");
        Assert.Equal(HttpStatusCode.NoContent, (await pair.OwnerClient.DeleteAsync(url, TestContext.Current.CancellationToken)).StatusCode);
    }

    [Fact]
    public async Task A_partner_links_a_payment_from_a_shared_account_and_both_see_one_tracked_balance()
    {
        using var pair = await CreateHouseholdPairAsync();
        var account = await CreateAccountAsync(householdId: pair.HouseholdId, client: pair.PartnerClient);
        var debt = await SharedDebtAsync(pair.OwnerClient, pair.HouseholdId);
        var payment = await CreateTransactionAsync(pair.PartnerClient, account, null, "expense", "100.00", "2026-05-10", "Mortgage");

        var linked = await ReadOkAsync<DebtDto>(await LinkAsync(pair.PartnerClient, debt, payment.Id));

        Assert.Equal("900.00", linked.TrackedBalance);
        Assert.Equal("900.00", (await DebtAsync(pair.OwnerClient, debt)).TrackedBalance);
        Assert.Equal("900.00", (await DebtAsync(pair.PartnerClient, debt)).TrackedBalance);
        Assert.Equal(payment.Id, Assert.Single(await PaymentsAsync(pair.OwnerClient, debt)).TransactionId);
        Assert.Equal(payment.Id, Assert.Single(await PaymentsAsync(pair.PartnerClient, debt)).TransactionId);
        Assert.Equal("900.00", (await NetWorthAsync(pair.OwnerClient)).Debts);
        Assert.Equal("900.00", (await NetWorthAsync(pair.PartnerClient)).Debts);
    }

    [Fact]
    public async Task Linking_a_payment_from_a_personal_account_to_a_shared_debt_is_refused()
    {
        using var pair = await CreateHouseholdPairAsync();
        var personal = await CreateAccountAsync(client: pair.OwnerClient);
        var debt = await SharedDebtAsync(pair.OwnerClient, pair.HouseholdId);
        var payment = await CreateTransactionAsync(pair.OwnerClient, personal, null, "expense", "100.00", "2026-05-10");

        await AssertProblemAsync(await LinkAsync(pair.OwnerClient, debt, payment.Id), HttpStatusCode.BadRequest, "household.referenceNotShared");
        Assert.Empty(await PaymentsAsync(pair.OwnerClient, debt));
    }

    [Fact]
    public async Task Sharing_a_debt_whose_payments_sit_on_a_personal_account_is_refused()
    {
        using var pair = await CreateHouseholdPairAsync();
        var personal = await CreateAccountAsync(client: pair.OwnerClient);
        var debt = (await PostAsync<IdDto>(pair.OwnerClient, "/api/debts", DebtBody(null))).Id;
        var payment = await CreateTransactionAsync(pair.OwnerClient, personal, null, "expense", "100.00", "2026-05-10");
        (await LinkAsync(pair.OwnerClient, debt, payment.Id)).EnsureSuccessStatusCode();

        var shared = await pair.OwnerClient.PutAsJsonAsync($"/api/debts/{debt}", DebtBody(pair.HouseholdId), TestContext.Current.CancellationToken);

        await AssertProblemAsync(shared, HttpStatusCode.BadRequest, "household.referenceNotShared");
        Assert.Equal("personal", (await DebtAsync(pair.OwnerClient, debt)).Scope);
    }

    [Fact]
    public async Task Candidates_for_a_shared_debt_are_only_expenses_on_accounts_shared_with_its_household()
    {
        using var pair = await CreateHouseholdPairAsync();
        var shared = await CreateAccountAsync(householdId: pair.HouseholdId, client: pair.OwnerClient);
        var personal = await CreateAccountAsync(client: pair.OwnerClient);
        var debt = await SharedDebtAsync(pair.OwnerClient, pair.HouseholdId);
        var fromShared = await CreateTransactionAsync(pair.OwnerClient, shared, null, "expense", "100.00", "2026-05-10");
        await CreateTransactionAsync(pair.OwnerClient, personal, null, "expense", "100.00", "2026-05-11");

        var candidates = await pair.OwnerClient.GetFromJsonAsync<List<IdDto>>($"/api/debts/{debt}/payment-candidates", TestContext.Current.CancellationToken);

        Assert.Equal([fromShared.Id], candidates!.Select(c => c.Id));
    }

    [Fact]
    public async Task A_partner_link_to_a_deleted_debt_is_cleaned_up_on_the_next_link()
    {
        using var pair = await CreateHouseholdPairAsync();
        var account = await CreateAccountAsync(householdId: pair.HouseholdId, client: pair.OwnerClient);
        var deleted = await SharedDebtAsync(pair.OwnerClient, pair.HouseholdId);
        var kept = await SharedDebtAsync(pair.OwnerClient, pair.HouseholdId);
        var payment = await CreateTransactionAsync(pair.PartnerClient, account, null, "expense", "100.00", "2026-05-10");
        (await LinkAsync(pair.PartnerClient, deleted, payment.Id)).EnsureSuccessStatusCode();
        (await pair.OwnerClient.DeleteAsync($"/api/debts/{deleted}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        var relinked = await ReadOkAsync<DebtDto>(await LinkAsync(pair.OwnerClient, kept, payment.Id));

        Assert.Equal("900.00", relinked.TrackedBalance);
    }

    [Fact]
    public async Task A_shared_recurring_entry_pays_a_debt_of_its_own_household_only()
    {
        using var pair = await CreateHouseholdPairAsync();
        var other = await CreateHouseholdAsync(pair.Owner);
        var account = await CreateAccountAsync("5000.00", householdId: pair.HouseholdId, client: pair.OwnerClient);
        var debt = await SharedDebtAsync(pair.OwnerClient, pair.HouseholdId);
        var otherDebt = await SharedDebtAsync(pair.OwnerClient, other);

        var bill = await PostAsync<IdDto>(pair.OwnerClient, "/api/recurring-bills", BillBody(account, debt, pair.HouseholdId));
        var refused = await pair.OwnerClient.PostAsJsonAsync("/api/recurring-bills", BillBody(account, otherDebt, pair.HouseholdId), TestContext.Current.CancellationToken);
        (await pair.PartnerClient.PostAsJsonAsync($"/api/recurring-bills/{bill.Id}/confirm", new { expectedDueDate = "2026-06-01" }, TestContext.Current.CancellationToken))
            .EnsureSuccessStatusCode();

        await AssertProblemAsync(refused, HttpStatusCode.BadRequest, "household.referenceNotShared");
        Assert.Equal("800.00", (await DebtAsync(pair.OwnerClient, debt)).TrackedBalance);
    }

    [Fact]
    public async Task A_personal_recurring_entry_on_a_personal_account_cannot_pay_a_shared_debt()
    {
        using var pair = await CreateHouseholdPairAsync();
        var personal = await CreateAccountAsync("5000.00", client: pair.OwnerClient);
        var debt = await SharedDebtAsync(pair.OwnerClient, pair.HouseholdId);

        var refused = await pair.OwnerClient.PostAsJsonAsync("/api/recurring-bills", BillBody(personal, debt, null), TestContext.Current.CancellationToken);

        await AssertProblemAsync(refused, HttpStatusCode.BadRequest, "household.referenceNotShared");
    }

    [Fact]
    public async Task Deleting_the_household_makes_assets_and_debts_personal_and_restoring_it_shares_them_again()
    {
        using var pair = await CreateHouseholdPairAsync();
        var asset = await PostAsync<AssetDto>(pair.OwnerClient, "/api/assets", AssetBody("12000.00", pair.HouseholdId));
        var debt = await SharedDebtAsync(pair.OwnerClient, pair.HouseholdId);

        (await Client.DeleteAsync($"/api/households/{pair.HouseholdId}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var partnerAssetsWhileDeleted = await AssetsAsync(pair.PartnerClient);
        var partnerDebtsWhileDeleted = await DebtsAsync(pair.PartnerClient);
        var ownerAsset = Assert.Single(await AssetsAsync(pair.OwnerClient));
        (await Client.PostAsJsonAsync("/api/trash/restore", new { kind = "household", entityId = pair.HouseholdId }, TestContext.Current.CancellationToken))
            .EnsureSuccessStatusCode();

        Assert.Empty(partnerAssetsWhileDeleted);
        Assert.Empty(partnerDebtsWhileDeleted);
        Assert.Equal((asset.Id, "personal", (Guid?)null), (ownerAsset.Id, ownerAsset.Scope, ownerAsset.HouseholdId));
        Assert.Equal(asset.Id, Assert.Single(await AssetsAsync(pair.PartnerClient)).Id);
        Assert.Equal(pair.HouseholdId, (await DebtAsync(pair.PartnerClient, debt)).HouseholdId);
    }

    [Fact]
    public async Task The_activity_log_records_a_valuation_a_payment_link_and_an_unlink()
    {
        using var pair = await CreateHouseholdPairAsync();
        var account = await CreateAccountAsync(householdId: pair.HouseholdId, client: pair.OwnerClient);
        var asset = await PostAsync<AssetDto>(pair.OwnerClient, "/api/assets", AssetBody("12000.00", pair.HouseholdId));
        var debt = await SharedDebtAsync(pair.OwnerClient, pair.HouseholdId);
        var payment = await CreateTransactionAsync(pair.OwnerClient, account, null, "expense", "450.00", "2026-05-15");
        var day = Today.AddDays(-3);

        (await pair.PartnerClient.PutAsJsonAsync($"/api/assets/{asset.Id}/valuations/{day:yyyy-MM-dd}", new { value = "11800.00" }, TestContext.Current.CancellationToken))
            .EnsureSuccessStatusCode();
        (await LinkAsync(pair.PartnerClient, debt, payment.Id)).EnsureSuccessStatusCode();
        var link = Assert.Single(await PaymentsAsync(pair.PartnerClient, debt)).Id;
        (await pair.PartnerClient.DeleteAsync($"/api/debts/{debt}/payments/{link}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        var events = (await ReadOkAsync<PageDto<AuditDto>>(await pair.OwnerClient.GetAsync(
            $"/api/households/{pair.HouseholdId}/audit?pageSize=50",
            TestContext.Current.CancellationToken))).Items;

        var valued = Assert.Single(events, e => e.EntityId == asset.Id && e.Action == "updated");
        Assert.Equal(("asset", pair.Partner.Id), (valued.EntityKind, valued.ActorUserId));
        Assert.Contains(new ChangeDto("valuations", null, $"{day:yyyy-MM-dd}: 11800.00 EUR"), valued.Changes);
        var debtEvents = events.Where(e => e.EntityId == debt && e.Action == "updated").Select(e => Assert.Single(e.Changes, c => c.Field == "payments")).ToList();
        Assert.Equal(2, debtEvents.Count);
        Assert.Null(debtEvents[0].To);
        Assert.EndsWith(", 2026-05-15, 450.00 EUR", debtEvents[0].From);
        Assert.Null(debtEvents[1].From);
        Assert.Equal(debtEvents[0].From, debtEvents[1].To);
        Assert.Contains(events, e => (e.EntityId, e.Action, e.EntityKind) == (debt, "created", "debt"));
    }

    [Fact]
    public async Task The_net_worth_under_an_active_household_is_narrowed_but_the_snapshot_keeps_the_whole_figure()
    {
        using var pair = await CreateHouseholdPairAsync();
        var other = await CreateHouseholdAsync(pair.Owner);
        await PostAsync<AssetDto>(pair.OwnerClient, "/api/assets", AssetBody("1000.00", pair.HouseholdId));
        await PostAsync<AssetDto>(pair.OwnerClient, "/api/assets", AssetBody("300.00", other));

        var narrowed = await GetScopedAsync<NetWorthDto>(pair.OwnerClient, "/api/networth", pair.HouseholdId);
        var history = await pair.OwnerClient.GetFromJsonAsync<HistoryDto>("/api/networth/history", TestContext.Current.CancellationToken);

        Assert.Equal("1000.00", narrowed.Assets);
        Assert.Equal("1300.00", Assert.Single(history!.Items).Assets);
    }

    private static object AssetBody(string currentValue, Guid? householdId) => new
    {
        name = "Family car",
        type = "vehicle",
        currentValue,
        asOf = "2026-05-01",
        scope = householdId is null ? "personal" : "shared",
        householdId,
    };

    private static object DebtBody(Guid? householdId) => new
    {
        name = "Mortgage",
        type = "mortgage",
        outstandingAmount = "1000.00",
        asOf = "2026-05-01",
        tracksPayments = true,
        scope = householdId is null ? "personal" : "shared",
        householdId,
    };

    private static object BillBody(Guid account, Guid debtId, Guid? householdId) => new
    {
        name = "Loan payment",
        shape = "expense",
        kind = "fixed",
        amount = "200.00",
        accountId = account,
        cadence = "monthly",
        nextDueDate = "2026-06-01",
        remindDaysBefore = 3,
        debtId,
        scope = householdId is null ? "personal" : "shared",
        householdId,
    };

    private static async Task<Guid> SharedDebtAsync(HttpClient client, Guid householdId) =>
        (await PostAsync<IdDto>(client, "/api/debts", DebtBody(householdId))).Id;

    private static Task<HttpResponseMessage> LinkAsync(HttpClient client, Guid debt, Guid transactionId) =>
        client.PostAsJsonAsync($"/api/debts/{debt}/payments", new { transactionId }, TestContext.Current.CancellationToken);

    private static async Task<List<AssetDto>> AssetsAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<List<AssetDto>>("/api/assets", TestContext.Current.CancellationToken))!;

    private static async Task<List<DebtDto>> DebtsAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<List<DebtDto>>("/api/debts", TestContext.Current.CancellationToken))!;

    private static async Task<DebtDto> DebtAsync(HttpClient client, Guid debt) =>
        (await DebtsAsync(client)).Single(d => d.Id == debt);

    private static async Task<List<PaymentDto>> PaymentsAsync(HttpClient client, Guid debt) =>
        (await client.GetFromJsonAsync<List<PaymentDto>>($"/api/debts/{debt}/payments", TestContext.Current.CancellationToken))!;

    private static async Task<NetWorthDto> NetWorthAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<NetWorthDto>("/api/networth", TestContext.Current.CancellationToken))!;

    private sealed record AssetDto(Guid Id, string Scope, Guid? HouseholdId);

    private sealed record DebtDto(Guid Id, string? TrackedBalance, string Scope, Guid? HouseholdId);

    private sealed record PaymentDto(Guid Id, Guid TransactionId);

    private sealed record NetWorthDto(string Assets, string Debts);

    private sealed record HistoryDto(List<NetWorthDto> Items);

    private sealed record ChangeDto(string Field, string? From, string? To);

    private sealed record AuditDto(Guid ActorUserId, string Action, string EntityKind, Guid? EntityId, List<ChangeDto> Changes);
}
