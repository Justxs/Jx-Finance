using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Imports;

[Collection<ImportsCollection>]
public sealed class ImportGroupingTests(ImportsFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task A_new_group_takes_the_imported_and_linked_rows_but_not_transfers_or_duplicates()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("500.00", client: member);
        var savings = await CreateAccountAsync(client: member);
        var typed = await CreateTransactionAsync(member, account, null, "expense", "25.00", "2026-07-02", "Hotel");
        var reference = Guid.NewGuid().ToString("N");
        await ConfirmAsync(member, account, null, Row($"{reference}-old", "9.00", "2026-07-01", "Earlier"));

        var confirmed = await ConfirmAsync(
            member,
            account,
            new { name = "Trip to Riga" },
            Row($"{reference}-new", "12.00", "2026-07-03", "Bus"),
            new { importRef = $"{reference}-linked", date = "2026-07-02", description = "HOTEL", amount = "25.00", type = "expense", existingTransactionId = typed.Id },
            new { importRef = $"{reference}-transfer", date = "2026-07-04", description = "Savings", amount = "50.00", type = "expense", transferAccountId = savings },
            Row($"{reference}-old", "9.00", "2026-07-01", "Earlier"));

        var group = Assert.Single(await GroupsAsync(member));
        var members = (await member.GetFromJsonAsync<GroupMembersDto>($"/api/transaction-groups/{group.Id}/members", TestContext.Current.CancellationToken))!;
        Assert.Equal((2, 1, 1), (confirmed.Imported, confirmed.Linked, confirmed.SkippedDuplicates));
        Assert.Equal(("Trip to Riga", "personal", 2), (group.Name, group.Scope, group.MemberCount));
        Assert.Equal(["Bus", "Hotel"], members.Items.Select(t => t.Description).Order());
    }

    [Fact]
    public async Task A_new_group_on_a_shared_account_is_shared_with_its_household()
    {
        using var pair = await CreateHouseholdPairAsync();
        var shared = await CreateAccountAsync(householdId: pair.HouseholdId, client: pair.OwnerClient);

        await ConfirmAsync(pair.OwnerClient, shared, new { name = "Groceries" }, Row($"G-{Guid.NewGuid():N}", "12.00", "2026-07-03", "Lidl"));

        var group = Assert.Single(await GroupsAsync(pair.PartnerClient));
        Assert.Equal(("Groceries", "shared", (Guid?)pair.HouseholdId, 1), (group.Name, group.Scope, group.HouseholdId, group.MemberCount));
    }

    [Fact]
    public async Task Rows_can_join_an_existing_group()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("500.00", client: member);
        var hotel = await CreateTransactionAsync(member, account, null, "expense", "25.00", "2026-07-02", "Hotel");
        var existing = await PostAsync<GroupDto>(member, "/api/transaction-groups", new { name = "Trip", transactionIds = new[] { hotel.Id } });

        await ConfirmAsync(member, account, new { id = existing.Id }, Row($"E-{Guid.NewGuid():N}", "12.00", "2026-07-03", "Bus"));

        Assert.Equal(2, Assert.Single(await GroupsAsync(member)).MemberCount);
    }

    [Fact]
    public async Task A_group_that_refuses_the_rows_rolls_the_whole_import_back()
    {
        using var pair = await CreateHouseholdPairAsync();
        var shared = await CreateAccountAsync(householdId: pair.HouseholdId, client: pair.OwnerClient);
        var personal = await CreateAccountAsync(client: pair.OwnerClient);
        var hotel = await CreateTransactionAsync(pair.OwnerClient, shared, null, "expense", "25.00", "2026-07-02", "Hotel");
        var group = await PostAsync<GroupDto>(
            pair.OwnerClient,
            "/api/transaction-groups",
            new { name = "Ours", transactionIds = new[] { hotel.Id }, scope = "shared", householdId = pair.HouseholdId });

        var refused = await pair.OwnerClient.PostAsJsonAsync(
            "/api/import/confirm",
            new { accountId = personal, group = new { id = group.Id }, rows = new[] { Row($"R-{Guid.NewGuid():N}", "12.00", "2026-07-03", "Bus") } },
            TestContext.Current.CancellationToken);
        var both = await pair.OwnerClient.PostAsJsonAsync(
            "/api/import/confirm",
            new { accountId = personal, group = new { id = group.Id, name = "Both" }, rows = new[] { Row($"R-{Guid.NewGuid():N}", "12.00", "2026-07-03", "Bus") } },
            TestContext.Current.CancellationToken);

        await AssertProblemAsync(refused, HttpStatusCode.BadRequest, "household.referenceNotShared");
        await AssertValidationErrorAsync(both, "group.name");
        Assert.Equal(0, (await pair.OwnerClient.GetFromJsonAsync<PageDto<TransactionDto>>($"/api/transactions?accountId={personal}", TestContext.Current.CancellationToken))!.Total);
    }

    private static object Row(string importRef, string amount, string date, string description) =>
        new { importRef, date, description, amount, type = "expense" };

    private static Task<ConfirmDto> ConfirmAsync(HttpClient client, Guid account, object? group, params object[] rows) =>
        PostAsync<ConfirmDto>(client, "/api/import/confirm", new { accountId = account, group, rows });

    private static async Task<List<GroupDto>> GroupsAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<List<GroupDto>>("/api/transaction-groups", TestContext.Current.CancellationToken))!;

    private sealed record ConfirmDto(int Imported, int SkippedDuplicates, int Linked);

    private sealed record GroupDto(Guid Id, string Name, int MemberCount, string Scope, Guid? HouseholdId);
}
