using System.IO.Compression;
using System.Net;
using System.Net.Http.Json;
using JxFinance.Endpoints.Users.Services;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.TransactionGroups;

[Collection<IntegrationCollection>]
public sealed class SharedTransactionGroupTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const string GroupsUrl = "/api/transaction-groups";

    [Fact]
    public async Task A_housemate_sees_adds_to_takes_out_of_and_renames_a_shared_group()
    {
        using var pair = await CreateHouseholdPairAsync();
        var shared = await CreateAccountAsync(householdId: pair.HouseholdId, client: pair.OwnerClient);
        var hotel = await CreateTransactionAsync(pair.OwnerClient, shared, null, "expense", "40.00", "2026-07-03", "Hotel");
        var bus = await CreateTransactionAsync(pair.OwnerClient, shared, null, "expense", "12.00", "2026-07-04", "Bus");
        var dinner = await CreateTransactionAsync(pair.PartnerClient, shared, null, "expense", "30.00", "2026-07-05", "Dinner");
        var group = await SharedGroupAsync(pair.OwnerClient, pair.HouseholdId, "Trip to Riga", hotel.Id, bus.Id);

        var seen = Assert.Single((await GroupsAsync(pair.PartnerClient)), g => g.Id == group.Id);
        var added = await pair.PartnerClient.PostAsJsonAsync($"{GroupsUrl}/{group.Id}/members", new { transactionIds = new[] { dinner.Id } }, TestContext.Current.CancellationToken);
        var removed = await pair.PartnerClient.DeleteAsync($"{GroupsUrl}/{group.Id}/members/{bus.Id}", TestContext.Current.CancellationToken);
        var renamed = await ReadOkAsync<SharedGroupDto>(await pair.PartnerClient.PutAsJsonAsync(
            $"{GroupsUrl}/{group.Id}",
            new { name = "Riga 2026", scope = "shared", householdId = pair.HouseholdId },
            TestContext.Current.CancellationToken));
        var partnerLedger = await LedgerAsync(pair.PartnerClient, $"accountId={shared}");

        Assert.Equal(("shared", pair.HouseholdId, 2), (seen.Scope, seen.HouseholdId, seen.MemberCount));
        Assert.Equal(HttpStatusCode.NoContent, added.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, removed.StatusCode);
        Assert.Equal(("Riga 2026", "shared", 2), (renamed.Name, renamed.Scope, renamed.MemberCount));
        Assert.Equal(2, partnerLedger.Items.Count);
        Assert.Equal((group.Id, 2), (partnerLedger.Items.Single(i => i.Kind == "group").Group!.Id, partnerLedger.Items.Single(i => i.Kind == "group").Group!.MemberCount));
        Assert.Equal(bus.Id, partnerLedger.Items.Single(i => i.Kind == "transaction").Transaction!.Id);
    }

    [Fact]
    public async Task A_row_on_an_account_the_household_does_not_share_is_refused()
    {
        using var pair = await CreateHouseholdPairAsync();
        var shared = await CreateAccountAsync(householdId: pair.HouseholdId, client: pair.OwnerClient);
        var personal = await CreateAccountAsync(client: pair.OwnerClient);
        var onShared = await CreateTransactionAsync(pair.OwnerClient, shared, null, "expense", "40.00", "2026-07-03");
        var onPersonal = await CreateTransactionAsync(pair.OwnerClient, personal, null, "expense", "12.00", "2026-07-04");
        var group = await SharedGroupAsync(pair.OwnerClient, pair.HouseholdId, "Trip", onShared.Id);
        var mine = await PostAsync<SharedGroupDto>(pair.OwnerClient, GroupsUrl, new { name = "Mine", transactionIds = new[] { onPersonal.Id } });

        var created = await pair.OwnerClient.PostAsJsonAsync(
            GroupsUrl,
            new { name = "Mixed", transactionIds = new[] { onShared.Id, onPersonal.Id }, scope = "shared", householdId = pair.HouseholdId },
            TestContext.Current.CancellationToken);
        var added = await pair.OwnerClient.PostAsJsonAsync($"{GroupsUrl}/{group.Id}/members", new { transactionIds = new[] { onPersonal.Id } }, TestContext.Current.CancellationToken);
        var shareMine = await pair.OwnerClient.PutAsJsonAsync($"{GroupsUrl}/{mine.Id}", new { name = "Mine", scope = "shared", householdId = pair.HouseholdId }, TestContext.Current.CancellationToken);
        var withoutHousehold = await pair.OwnerClient.PostAsJsonAsync(GroupsUrl, new { name = "Nowhere", transactionIds = new[] { onShared.Id }, scope = "shared" }, TestContext.Current.CancellationToken);

        await AssertProblemAsync(created, HttpStatusCode.BadRequest, "household.referenceNotShared");
        await AssertProblemAsync(added, HttpStatusCode.BadRequest, "household.referenceNotShared");
        await AssertProblemAsync(shareMine, HttpStatusCode.BadRequest, "household.referenceNotShared");
        await AssertProblemAsync(withoutHousehold, HttpStatusCode.BadRequest, "household.required");
    }

    [Fact]
    public async Task Only_the_owner_unshares_or_ungroups_and_unsharing_takes_out_other_peoples_rows()
    {
        using var pair = await CreateHouseholdPairAsync();
        var shared = await CreateAccountAsync(householdId: pair.HouseholdId, client: pair.OwnerClient);
        var hotel = await CreateTransactionAsync(pair.OwnerClient, shared, null, "expense", "40.00", "2026-07-03", "Hotel");
        var dinner = await CreateTransactionAsync(pair.PartnerClient, shared, null, "expense", "30.00", "2026-07-05", "Dinner");
        var group = await SharedGroupAsync(pair.OwnerClient, pair.HouseholdId, "Trip", hotel.Id, dinner.Id);

        var partnerUnshare = await pair.PartnerClient.PutAsJsonAsync($"{GroupsUrl}/{group.Id}", new { name = "Trip", scope = "personal" }, TestContext.Current.CancellationToken);
        var partnerUngroup = await pair.PartnerClient.DeleteAsync($"{GroupsUrl}/{group.Id}", TestContext.Current.CancellationToken);
        var unshared = await ReadOkAsync<SharedGroupDto>(await pair.OwnerClient.PutAsJsonAsync($"{GroupsUrl}/{group.Id}", new { name = "Trip", scope = "personal" }, TestContext.Current.CancellationToken));
        var dinnerNow = await pair.OwnerClient.GetFromJsonAsync<TransactionDto>($"/api/transactions/{dinner.Id}", TestContext.Current.CancellationToken);

        await AssertProblemAsync(partnerUnshare, HttpStatusCode.Forbidden, "access.forbidden");
        await AssertProblemAsync(partnerUngroup, HttpStatusCode.Forbidden, "access.forbidden");
        Assert.Equal(("personal", (Guid?)null, 1), (unshared.Scope, unshared.HouseholdId, unshared.MemberCount));
        Assert.Null(dinnerNow!.GroupId);
        Assert.DoesNotContain(await GroupsAsync(pair.PartnerClient), g => g.Id == group.Id);
    }

    [Fact]
    public async Task A_row_in_its_authors_group_or_a_visible_group_is_taken_but_one_in_a_group_nobody_here_sees_is_not()
    {
        using var pair = await CreateHouseholdPairAsync();
        var shared = await CreateAccountAsync(householdId: pair.HouseholdId, client: pair.OwnerClient);
        var hotel = await CreateTransactionAsync(pair.OwnerClient, shared, null, "expense", "40.00", "2026-07-03", "Hotel");
        var dinner = await CreateTransactionAsync(pair.PartnerClient, shared, null, "expense", "30.00", "2026-07-05", "Dinner");
        var taxi = await CreateTransactionAsync(pair.OwnerClient, shared, null, "expense", "9.00", "2026-07-06", "Taxi");
        await PostAsync<SharedGroupDto>(pair.PartnerClient, GroupsUrl, new { name = "Partner's", transactionIds = new[] { dinner.Id } });
        await SharedGroupAsync(pair.PartnerClient, pair.HouseholdId, "Partner's trip", taxi.Id);
        var group = await SharedGroupAsync(pair.OwnerClient, pair.HouseholdId, "Trip", hotel.Id);

        var taken = await pair.OwnerClient.PostAsJsonAsync($"{GroupsUrl}/{group.Id}/members", new { transactionIds = new[] { dinner.Id } }, TestContext.Current.CancellationToken);
        var visible = await pair.OwnerClient.PostAsJsonAsync($"{GroupsUrl}/{group.Id}/members", new { transactionIds = new[] { taxi.Id } }, TestContext.Current.CancellationToken);
        (await Client.DeleteAsync($"/api/households/{pair.HouseholdId}/members/{pair.Partner.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var stale = await pair.OwnerClient.PostAsJsonAsync($"{GroupsUrl}/{group.Id}/members", new { transactionIds = new[] { taxi.Id } }, TestContext.Current.CancellationToken);
        var stillTaken = await pair.OwnerClient.PostAsJsonAsync($"{GroupsUrl}/{group.Id}/members", new { transactionIds = new[] { dinner.Id } }, TestContext.Current.CancellationToken);

        await AssertProblemAsync(taken, HttpStatusCode.Conflict, "transactionGroup.memberTaken");
        await AssertProblemAsync(visible, HttpStatusCode.Conflict, "transactionGroup.memberTaken");
        Assert.Equal(HttpStatusCode.NoContent, stale.StatusCode);
        await AssertProblemAsync(stillTaken, HttpStatusCode.Conflict, "transactionGroup.memberTaken");
        Assert.Equal(group.Id, (await pair.OwnerClient.GetFromJsonAsync<TransactionDto>($"/api/transactions/{taxi.Id}", TestContext.Current.CancellationToken))!.GroupId);
    }

    [Fact]
    public async Task A_shared_group_writes_activity_rows_and_a_personal_one_none()
    {
        using var pair = await CreateHouseholdPairAsync();
        var shared = await CreateAccountAsync(householdId: pair.HouseholdId, client: pair.OwnerClient);
        var hotel = await CreateTransactionAsync(pair.OwnerClient, shared, null, "expense", "40.00", "2026-07-03", "Hotel");
        var bus = await CreateTransactionAsync(pair.OwnerClient, shared, null, "expense", "12.00", "2026-07-04", "Bus");
        var dinner = await CreateTransactionAsync(pair.PartnerClient, shared, null, "expense", "30.00", "2026-07-05", "Dinner");
        var taxi = await CreateTransactionAsync(pair.OwnerClient, shared, null, "expense", "9.00", "2026-07-06", "Taxi");
        var group = await SharedGroupAsync(pair.OwnerClient, pair.HouseholdId, "Trip to Riga", hotel.Id, bus.Id);
        var personal = await PostAsync<SharedGroupDto>(pair.OwnerClient, GroupsUrl, new { name = "Private", transactionIds = new[] { taxi.Id } });
        (await pair.PartnerClient.PostAsJsonAsync($"{GroupsUrl}/{group.Id}/members", new { transactionIds = new[] { dinner.Id } }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        (await pair.OwnerClient.DeleteAsync($"{GroupsUrl}/{group.Id}/members/{bus.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        (await pair.OwnerClient.PutAsJsonAsync($"{GroupsUrl}/{group.Id}", new { name = "Riga", scope = "shared", householdId = pair.HouseholdId }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        var events = (await ReadOkAsync<PageDto<AuditDto>>(await pair.OwnerClient.GetAsync(
            $"/api/households/{pair.HouseholdId}/audit?pageSize=50",
            TestContext.Current.CancellationToken))).Items.Where(e => e.EntityKind == "transactionGroup").ToList();

        Assert.DoesNotContain(events, e => e.EntityId == personal.Id);
        var mine = events.Where(e => e.EntityId == group.Id).OrderBy(e => e.OccurredAt).ToList();
        Assert.Equal(4, mine.Count);
        Assert.Equal(("created", pair.Owner.Id, 2), (mine[0].Action, mine[0].ActorUserId, mine[0].Count));
        Assert.Equal(("updated", pair.Partner.Id, 1), (mine[1].Action, mine[1].ActorUserId, mine[1].Count));
        Assert.EndsWith("transaction added", mine[1].Description, StringComparison.Ordinal);
        Assert.EndsWith("transaction removed", mine[2].Description, StringComparison.Ordinal);
        Assert.Contains(mine[3].Changes, c => c.To == "Riga");
    }

    [Fact]
    public async Task Deleting_the_household_makes_the_group_personal_and_restoring_it_shares_it_again()
    {
        using var pair = await CreateHouseholdPairAsync();
        var shared = await CreateAccountAsync(householdId: pair.HouseholdId, client: pair.OwnerClient);
        var hotel = await CreateTransactionAsync(pair.OwnerClient, shared, null, "expense", "40.00", "2026-07-03", "Hotel");
        var group = await SharedGroupAsync(pair.OwnerClient, pair.HouseholdId, "Trip", hotel.Id);

        (await Client.DeleteAsync($"/api/households/{pair.HouseholdId}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var whileDeleted = Assert.Single(await GroupsAsync(pair.OwnerClient), g => g.Id == group.Id);
        var partnerWhileDeleted = await GroupsAsync(pair.PartnerClient);
        (await Client.PostAsJsonAsync("/api/trash/restore", new { kind = "household", entityId = pair.HouseholdId }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var restored = Assert.Single(await GroupsAsync(pair.PartnerClient), g => g.Id == group.Id);

        Assert.Equal(("personal", (Guid?)null), (whileDeleted.Scope, whileDeleted.HouseholdId));
        Assert.DoesNotContain(partnerWhileDeleted, g => g.Id == group.Id);
        Assert.Equal(("shared", (Guid?)pair.HouseholdId), (restored.Scope, restored.HouseholdId));
    }

    [Fact]
    public async Task Restoring_an_ungrouped_shared_group_puts_the_housemates_rows_back()
    {
        using var pair = await CreateHouseholdPairAsync();
        var shared = await CreateAccountAsync(householdId: pair.HouseholdId, client: pair.OwnerClient);
        var hotel = await CreateTransactionAsync(pair.OwnerClient, shared, null, "expense", "40.00", "2026-07-03", "Hotel");
        var dinner = await CreateTransactionAsync(pair.PartnerClient, shared, null, "expense", "30.00", "2026-07-05", "Dinner");
        var group = await SharedGroupAsync(pair.OwnerClient, pair.HouseholdId, "Trip", hotel.Id, dinner.Id);

        Assert.Equal(HttpStatusCode.NoContent, (await pair.OwnerClient.DeleteAsync($"{GroupsUrl}/{group.Id}", TestContext.Current.CancellationToken)).StatusCode);
        Assert.Null((await pair.PartnerClient.GetFromJsonAsync<TransactionDto>($"/api/transactions/{dinner.Id}", TestContext.Current.CancellationToken))!.GroupId);
        (await pair.OwnerClient.PostAsJsonAsync("/api/trash/restore", new { kind = "transactionGroup", entityId = group.Id }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        Assert.Equal(group.Id, (await pair.PartnerClient.GetFromJsonAsync<TransactionDto>($"/api/transactions/{dinner.Id}", TestContext.Current.CancellationToken))!.GroupId);
        Assert.Equal(2, Assert.Single(await GroupsAsync(pair.PartnerClient), g => g.Id == group.Id).MemberCount);
    }

    [Fact]
    public async Task A_shared_group_belongs_to_its_owners_download_and_not_to_a_housemates()
    {
        using var pair = await CreateHouseholdPairAsync();
        var shared = await CreateAccountAsync(householdId: pair.HouseholdId, client: pair.OwnerClient);
        var hotel = await CreateTransactionAsync(pair.OwnerClient, shared, null, "expense", "40.00", "2026-07-03", "Hotel");
        var dinner = await CreateTransactionAsync(pair.PartnerClient, shared, null, "expense", "30.00", "2026-07-05", "Dinner");
        await SharedGroupAsync(pair.OwnerClient, pair.HouseholdId, "Trip to Riga", hotel.Id, dinner.Id);

        await CreateTransactionAsync(pair.PartnerClient, await CreateAccountAsync(client: pair.PartnerClient), null, "expense", "3.00", "2026-07-06", "Coffee");

        var ownerCsv = await TransactionsCsvAsync(pair.OwnerClient);
        var partnerCsv = await TransactionsCsvAsync(pair.PartnerClient);

        Assert.Equal(2, ownerCsv.Split('\n').Count(line => line.TrimEnd().EndsWith(",Trip to Riga", StringComparison.Ordinal)));
        Assert.Contains(partnerCsv.Split('\n'), line => line.StartsWith("2026-07-06,Coffee,", StringComparison.Ordinal) && line.TrimEnd().EndsWith(','));
        Assert.DoesNotContain("Trip to Riga", partnerCsv, StringComparison.Ordinal);
    }

    private static Task<SharedGroupDto> SharedGroupAsync(HttpClient client, Guid household, string name, params Guid[] transactionIds) =>
        PostAsync<SharedGroupDto>(client, GroupsUrl, new { name, transactionIds, scope = "shared", householdId = household });

    private static async Task<List<SharedGroupDto>> GroupsAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<List<SharedGroupDto>>(GroupsUrl, TestContext.Current.CancellationToken))!;

    private static async Task<PageDto<LedgerItemDto>> LedgerAsync(HttpClient client, string query) =>
        (await client.GetFromJsonAsync<PageDto<LedgerItemDto>>($"/api/transactions/ledger?pageSize=50&{query}", TestContext.Current.CancellationToken))!;

    private static async Task<string> TransactionsCsvAsync(HttpClient client)
    {
        var zip = await client.GetByteArrayAsync("/api/users/me/export", TestContext.Current.CancellationToken);
        using var archive = new ZipArchive(new MemoryStream(zip), ZipArchiveMode.Read);
        return await new StreamReader(archive.GetEntry(UserExportService.TransactionsEntry)!.Open()).ReadToEndAsync(TestContext.Current.CancellationToken);
    }

    private sealed record SharedGroupDto(Guid Id, string Name, int MemberCount, string Scope, Guid? HouseholdId);

    private sealed record ChangeDto(string Field, string? From, string? To);

    private sealed record AuditDto(
        DateTimeOffset OccurredAt,
        Guid ActorUserId,
        string Action,
        string EntityKind,
        Guid? EntityId,
        string Description,
        int? Count,
        List<ChangeDto> Changes);
}
