using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.TransactionGroups;

[Collection<ReportsCollection>]
public sealed class TransactionGroupTests(ReportsFixture fixture) : IntegrationTestBase(fixture)
{
    private const string GroupsUrl = "/api/transaction-groups";

    [Fact]
    public async Task A_group_is_created_renamed_listed_and_loses_a_member_that_is_removed()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var hotel = await CreateTransactionAsync(member, account, null, "expense", "40.00", "2026-07-03", "Hotel");
        var bus = await CreateTransactionAsync(member, account, null, "expense", "12.00", "2026-07-04", "Bus");

        var response = await member.PostAsJsonAsync(
            GroupsUrl,
            new { name = "  Trip to Riga ", transactionIds = new[] { hotel.Id, bus.Id } },
            TestContext.Current.CancellationToken);
        var created = await ReadOkAsync<TransactionGroupDto>(response);
        var renamed = await ReadOkAsync<TransactionGroupDto>(
            await member.PutAsJsonAsync($"{GroupsUrl}/{created.Id}", new { name = "Riga 2026" }, TestContext.Current.CancellationToken));
        var removed = await member.DeleteAsync($"{GroupsUrl}/{created.Id}/members/{bus.Id}", TestContext.Current.CancellationToken);
        var again = await member.DeleteAsync($"{GroupsUrl}/{created.Id}/members/{bus.Id}", TestContext.Current.CancellationToken);
        var listed = (await member.GetFromJsonAsync<List<TransactionGroupDto>>(GroupsUrl, TestContext.Current.CancellationToken))!;
        var ledger = await LedgerAsync(member);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal($"/api/transaction-groups/{created.Id}", response.Headers.Location?.OriginalString);
        Assert.Equal(("Trip to Riga", 2, new DateOnly(2026, 7, 3), new DateOnly(2026, 7, 4)), (created.Name, created.MemberCount, created.FirstDate, created.LastDate));
        Assert.Equal("Riga 2026", renamed.Name);
        Assert.Equal(HttpStatusCode.NoContent, removed.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, again.StatusCode);
        Assert.Equal((created.Id, 1), (Assert.Single(listed).Id, listed[0].MemberCount));
        Assert.Equal(2, ledger.Items.Count);
        Assert.Contains(ledger.Items, item => item.Kind == "group" && item.Group!.MemberCount == 1);
        Assert.Contains(ledger.Items, item => item.Kind == "transaction" && item.Transaction!.Id == bus.Id && item.Transaction.GroupId is null);
    }

    [Fact]
    public async Task A_group_needs_a_name_and_at_least_one_row_and_one_row_may_start_it()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var row = await CreateTransactionAsync(member, account, null, "expense", "40.00", "2026-07-03");

        var none = await member.PostAsJsonAsync(GroupsUrl, new { name = "Trip", transactionIds = Array.Empty<Guid>() }, TestContext.Current.CancellationToken);
        var tooMany = await member.PostAsJsonAsync(GroupsUrl, new { name = "Trip", transactionIds = Enumerable.Range(0, 201).Select(_ => Guid.NewGuid()).ToArray() }, TestContext.Current.CancellationToken);
        var blank = await member.PostAsJsonAsync(GroupsUrl, new { name = "  ", transactionIds = new[] { row.Id, Guid.NewGuid() } }, TestContext.Current.CancellationToken);
        var tooLong = await member.PostAsJsonAsync(GroupsUrl, new { name = new string('x', 121), transactionIds = new[] { row.Id, Guid.NewGuid() } }, TestContext.Current.CancellationToken);

        var single = await member.PostAsJsonAsync(GroupsUrl, new { name = "Trip", transactionIds = new[] { row.Id, row.Id } }, TestContext.Current.CancellationToken);

        await AssertProblemAsync(none, HttpStatusCode.BadRequest, "required");
        await AssertProblemAsync(tooMany, HttpStatusCode.BadRequest, "collection.invalidSize");
        await AssertProblemAsync(blank, HttpStatusCode.BadRequest, "text.tooShort");
        await AssertProblemAsync(tooLong, HttpStatusCode.BadRequest, "text.tooLong");
        Assert.Equal(1, (await ReadOkAsync<TransactionGroupDto>(single)).MemberCount);
    }

    [Fact]
    public async Task Grouping_a_row_entered_by_someone_else_is_forbidden_and_an_invisible_row_is_not_found()
    {
        using var pair = await CreateHouseholdPairAsync();
        var shared = await CreateAccountAsync(householdId: pair.HouseholdId, client: pair.OwnerClient);
        var mine = await CreateTransactionAsync(pair.OwnerClient, shared, null, "expense", "10.00", "2026-07-01");
        var theirs = await CreateTransactionAsync(pair.PartnerClient, shared, null, "expense", "20.00", "2026-07-02");
        using var stranger = await CreateUserClientAsync();
        var strangersAccount = await CreateAccountAsync(client: stranger);
        var hidden = await CreateTransactionAsync(stranger, strangersAccount, null, "expense", "30.00", "2026-07-03");
        var mineToo = await CreateTransactionAsync(pair.OwnerClient, shared, null, "expense", "15.00", "2026-07-04");
        var group = await PostAsync<TransactionGroupDto>(pair.OwnerClient, GroupsUrl, new { name = "Mine", transactionIds = new[] { mine.Id, mineToo.Id } });

        var forbidden = await pair.OwnerClient.PostAsJsonAsync(GroupsUrl, new { name = "Ours", transactionIds = new[] { mine.Id, theirs.Id } }, TestContext.Current.CancellationToken);
        var invisible = await pair.OwnerClient.PostAsJsonAsync(GroupsUrl, new { name = "Theirs", transactionIds = new[] { mine.Id, hidden.Id } }, TestContext.Current.CancellationToken);
        var addForbidden = await pair.OwnerClient.PostAsJsonAsync($"{GroupsUrl}/{group.Id}/members", new { transactionIds = new[] { theirs.Id } }, TestContext.Current.CancellationToken);
        var addToMissing = await pair.OwnerClient.PostAsJsonAsync($"{GroupsUrl}/{Guid.NewGuid()}/members", new { transactionIds = new[] { mine.Id } }, TestContext.Current.CancellationToken);

        await AssertProblemAsync(forbidden, HttpStatusCode.Forbidden, "access.forbidden");
        await AssertProblemAsync(invisible, HttpStatusCode.NotFound, "resource.notFound");
        await AssertProblemAsync(addForbidden, HttpStatusCode.Forbidden, "access.forbidden");
        await AssertProblemAsync(addToMissing, HttpStatusCode.NotFound, "resource.notFound");
    }

    [Fact]
    public async Task A_row_in_another_group_is_taken_until_it_is_removed_from_it()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var rows = new List<Guid>();
        for (var day = 1; day <= 4; day++)
        {
            rows.Add((await CreateTransactionAsync(member, account, null, "expense", "5.00", $"2026-07-0{day}")).Id);
        }

        var first = await PostAsync<TransactionGroupDto>(member, GroupsUrl, new { name = "First", transactionIds = new[] { rows[0], rows[1] } });
        var second = await PostAsync<TransactionGroupDto>(member, GroupsUrl, new { name = "Second", transactionIds = new[] { rows[2], rows[3] } });

        var created = await member.PostAsJsonAsync(GroupsUrl, new { name = "Third", transactionIds = new[] { rows[0], rows[2] } }, TestContext.Current.CancellationToken);
        var added = await member.PostAsJsonAsync($"{GroupsUrl}/{second.Id}/members", new { transactionIds = new[] { rows[0] } }, TestContext.Current.CancellationToken);
        var sameGroup = await member.PostAsJsonAsync($"{GroupsUrl}/{first.Id}/members", new { transactionIds = new[] { rows[0] } }, TestContext.Current.CancellationToken);
        (await member.DeleteAsync($"{GroupsUrl}/{first.Id}/members/{rows[0]}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var moved = await member.PostAsJsonAsync($"{GroupsUrl}/{second.Id}/members", new { transactionIds = new[] { rows[0] } }, TestContext.Current.CancellationToken);
        var row = await member.GetFromJsonAsync<TransactionDto>($"/api/transactions/{rows[0]}", TestContext.Current.CancellationToken);

        await AssertProblemAsync(created, HttpStatusCode.Conflict, "transactionGroup.memberTaken");
        await AssertProblemAsync(added, HttpStatusCode.Conflict, "transactionGroup.memberTaken");
        Assert.Equal(HttpStatusCode.NoContent, sameGroup.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, moved.StatusCode);
        Assert.Equal(second.Id, row!.GroupId);
    }

    [Fact]
    public async Task A_housemate_sees_the_members_on_a_shared_account_as_ordinary_rows_and_never_the_group()
    {
        using var pair = await CreateHouseholdPairAsync();
        var shared = await CreateAccountAsync(householdId: pair.HouseholdId, client: pair.OwnerClient);
        var hotel = await CreateTransactionAsync(pair.OwnerClient, shared, null, "expense", "40.00", "2026-07-03", "Hotel");
        var bus = await CreateTransactionAsync(pair.OwnerClient, shared, null, "expense", "12.00", "2026-07-04", "Bus");
        var group = await PostAsync<TransactionGroupDto>(pair.OwnerClient, GroupsUrl, new { name = "Trip to Riga", transactionIds = new[] { hotel.Id, bus.Id } });

        var owners = await LedgerAsync(pair.OwnerClient, $"accountId={shared}");
        var partners = await LedgerAsync(pair.PartnerClient, $"accountId={shared}");
        var partnerRow = await pair.PartnerClient.GetFromJsonAsync<TransactionDto>($"/api/transactions/{hotel.Id}", TestContext.Current.CancellationToken);
        var partnerGroups = await pair.PartnerClient.GetFromJsonAsync<List<TransactionGroupDto>>(GroupsUrl, TestContext.Current.CancellationToken);
        var partnerMembers = await pair.PartnerClient.GetAsync($"{GroupsUrl}/{group.Id}/members", TestContext.Current.CancellationToken);
        var partnerUngroup = await pair.PartnerClient.DeleteAsync($"{GroupsUrl}/{group.Id}", TestContext.Current.CancellationToken);
        var partnerCsv = await pair.PartnerClient.GetStringAsync($"/api/transactions/export?accountId={shared}", TestContext.Current.CancellationToken);

        Assert.Equal("group", Assert.Single(owners.Items).Kind);
        Assert.Equal(2, partners.Items.Count);
        Assert.All(partners.Items, item => Assert.Equal(("transaction", null, false), (item.Kind, item.Transaction!.GroupId, item.Transaction.EnteredByMe)));
        Assert.Null(partnerRow!.GroupId);
        Assert.Empty(partnerGroups!);
        Assert.Equal(HttpStatusCode.NotFound, partnerMembers.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, partnerUngroup.StatusCode);
        Assert.DoesNotContain("Trip to Riga", partnerCsv, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Ungroup_goes_to_the_trash_and_restoring_it_regroups_the_members()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var hotel = await CreateTransactionAsync(member, account, null, "expense", "40.00", "2026-07-03", "Hotel");
        var bus = await CreateTransactionAsync(member, account, null, "expense", "12.00", "2026-07-04", "Bus");
        var group = await PostAsync<TransactionGroupDto>(member, GroupsUrl, new { name = "Trip to Riga", transactionIds = new[] { hotel.Id, bus.Id } });

        var ungrouped = await member.DeleteAsync($"{GroupsUrl}/{group.Id}", TestContext.Current.CancellationToken);
        var flat = await LedgerAsync(member);
        var trash = (await member.GetFromJsonAsync<PageDto<TrashRow>>("/api/trash", TestContext.Current.CancellationToken))!;
        var restored = await RestoreAsync(member, "transactionGroup", group.Id);
        var regrouped = await LedgerAsync(member);

        Assert.Equal(HttpStatusCode.NoContent, ungrouped.StatusCode);
        Assert.Equal(["transaction", "transaction"], flat.Items.Select(item => item.Kind));
        Assert.All(flat.Items, item => Assert.Null(item.Transaction!.GroupId));
        Assert.Equal("Trip to Riga, 2 transactions", Assert.Single(trash.Items, row => row.Kind == "transactionGroup").Description);
        Assert.Equal(HttpStatusCode.NoContent, restored.StatusCode);
        var item = Assert.Single(regrouped.Items);
        Assert.Equal((group.Id, "Trip to Riga", 2), (item.Group!.Id, item.Group.Name, item.Group.MemberCount));
    }

    [Fact]
    public async Task A_member_trashed_while_grouped_comes_back_into_its_group()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var hotel = await CreateTransactionAsync(member, account, null, "expense", "40.00", "2026-07-03", "Hotel");
        var bus = await CreateTransactionAsync(member, account, null, "expense", "12.00", "2026-07-04", "Bus");
        var dinner = await CreateTransactionAsync(member, account, null, "expense", "30.00", "2026-07-05", "Dinner");
        var group = await PostAsync<TransactionGroupDto>(member, GroupsUrl, new { name = "Trip to Riga", transactionIds = new[] { hotel.Id, bus.Id, dinner.Id } });

        (await member.DeleteAsync($"/api/transactions/{bus.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var smaller = Assert.Single((await LedgerAsync(member)).Items).Group!;
        (await RestoreAsync(member, "transaction", bus.Id)).EnsureSuccessStatusCode();
        var whole = Assert.Single((await LedgerAsync(member)).Items).Group!;
        var row = await member.GetFromJsonAsync<TransactionDto>($"/api/transactions/{bus.Id}", TestContext.Current.CancellationToken);

        Assert.Equal((2, "-70.00"), (smaller.MemberCount, smaller.NetReportingAmount));
        Assert.Equal((3, "-82.00"), (whole.MemberCount, whole.NetReportingAmount));
        Assert.Equal(group.Id, row!.GroupId);
    }

    [Fact]
    public async Task A_member_restored_after_its_group_was_ungrouped_comes_back_as_an_ordinary_row()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var hotel = await CreateTransactionAsync(member, account, null, "expense", "40.00", "2026-07-03", "Hotel");
        var bus = await CreateTransactionAsync(member, account, null, "expense", "12.00", "2026-07-04", "Bus");
        var dinner = await CreateTransactionAsync(member, account, null, "expense", "30.00", "2026-07-05", "Dinner");
        var group = await PostAsync<TransactionGroupDto>(member, GroupsUrl, new { name = "Trip to Riga", transactionIds = new[] { hotel.Id, bus.Id, dinner.Id } });

        (await member.DeleteAsync($"/api/transactions/{bus.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        (await member.DeleteAsync($"{GroupsUrl}/{group.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        (await RestoreAsync(member, "transaction", bus.Id)).EnsureSuccessStatusCode();
        var ledger = await LedgerAsync(member);
        var trash = (await member.GetFromJsonAsync<PageDto<TrashRow>>("/api/trash", TestContext.Current.CancellationToken))!;

        Assert.Equal(3, ledger.Items.Count);
        Assert.All(ledger.Items, item => Assert.Equal(("transaction", null), (item.Kind, item.Transaction!.GroupId)));
        Assert.Equal("Trip to Riga, 2 transactions", Assert.Single(trash.Items, row => row.Kind == "transactionGroup").Description);
    }

    [Fact]
    public async Task The_ledger_csv_names_the_group_of_each_member()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var hotel = await CreateTransactionAsync(member, account, null, "expense", "40.00", "2026-07-03", "Hotel");
        var bus = await CreateTransactionAsync(member, account, null, "expense", "12.00", "2026-07-04", "Bus");
        await CreateTransactionAsync(member, account, null, "expense", "5.00", "2026-07-05", "Coffee");
        await PostAsync<TransactionGroupDto>(member, GroupsUrl, new { name = "Trip, Riga", transactionIds = new[] { hotel.Id, bus.Id } });

        var csv = await member.GetStringAsync("/api/transactions/export", TestContext.Current.CancellationToken);
        var lines = csv.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        Assert.EndsWith(",Place,Group", lines[0], StringComparison.Ordinal);
        Assert.StartsWith("2026-07-05,Coffee,", lines[1], StringComparison.Ordinal);
        Assert.EndsWith(",", lines[1], StringComparison.Ordinal);
        Assert.All(lines[2..], line => Assert.EndsWith(",\"Trip, Riga\"", line, StringComparison.Ordinal));
    }

    private static async Task<PageDto<LedgerItemDto>> LedgerAsync(HttpClient client, string query = "") =>
        (await client.GetFromJsonAsync<PageDto<LedgerItemDto>>($"/api/transactions/ledger?pageSize=50&{query}", TestContext.Current.CancellationToken))!;

    private static Task<HttpResponseMessage> RestoreAsync(HttpClient client, string kind, Guid entityId) =>
        client.PostAsJsonAsync("/api/trash/restore", new { kind, entityId }, TestContext.Current.CancellationToken);
}
