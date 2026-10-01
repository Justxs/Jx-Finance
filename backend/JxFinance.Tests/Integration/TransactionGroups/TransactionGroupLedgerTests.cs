using System.Globalization;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.TransactionGroups;

[Collection<IntegrationCollection>]
public sealed class TransactionGroupLedgerTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const string GroupsUrl = "/api/transaction-groups";

    [Theory]
    [InlineData("date", "desc")]
    [InlineData("date", "asc")]
    [InlineData("description", "desc")]
    [InlineData("description", "asc")]
    [InlineData("category", "desc")]
    [InlineData("category", "asc")]
    [InlineData("account", "desc")]
    [InlineData("account", "asc")]
    [InlineData("amount", "desc")]
    [InlineData("amount", "asc")]
    public async Task A_group_occupies_one_ledger_item_under_every_sort_and_paging_never_shows_it_twice(string sort, string direction)
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var food = await CreateCategoryAsync(client: member);
        List<Guid> loose = [];
        for (var day = 1; day <= 5; day++)
        {
            loose.Add((await CreateTransactionAsync(member, account, day % 2 == 0 ? food : null, "expense", $"{day}.00", $"2026-07-{day * 4:00}", $"Row {day}")).Id);
        }

        List<Guid> members = [];
        for (var day = 1; day <= 4; day++)
        {
            members.Add((await CreateTransactionAsync(member, account, food, "expense", $"{day * 3}.00", $"2026-07-{day * 5:00}", $"Trip {day}")).Id);
        }

        var group = await CreateGroupAsync(member, "Trip to Riga", members);

        List<LedgerItemDto> seen = [];
        var total = 0;
        for (var page = 1; page <= 4; page++)
        {
            var items = await LedgerAsync(member, $"sort={sort}&direction={direction}&page={page}&pageSize=2");
            seen.AddRange(items.Items);
            total = items.Total;
        }

        Assert.Equal(6, total);
        Assert.Equal(6, seen.Count);
        Assert.Single(seen, item => item.Kind == "group" && item.Group!.Id == group.Id);
        Assert.Equal(loose.Order(), seen.Where(item => item.Kind == "transaction").Select(item => item.Transaction!.Id).Order());
        Assert.DoesNotContain(seen, item => item.Transaction is { } row && members.Contains(row.Id));
    }

    [Fact]
    public async Task The_newest_member_places_a_group_by_date_and_its_net_by_amount()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var first = await CreateTransactionAsync(member, account, null, "expense", "10.00", "2026-07-01", "First");
        var middle = await CreateTransactionAsync(member, account, null, "expense", "100.00", "2026-07-10", "Middle");
        var last = await CreateTransactionAsync(member, account, null, "expense", "70.00", "2026-07-20", "Last");
        var hotel = await CreateTransactionAsync(member, account, null, "expense", "60.00", "2026-07-05", "Hotel");
        var refund = await CreateTransactionAsync(member, account, null, "income", "8.00", "2026-07-15", "Deposit back");
        var group = await CreateGroupAsync(member, "Trip to Riga", [hotel.Id, refund.Id]);

        var newest = await OrderAsync(member, "sort=date&direction=desc");
        var oldest = await OrderAsync(member, "sort=date&direction=asc");
        var byAmount = await OrderAsync(member, "sort=amount&direction=asc");
        var summary = Assert.Single((await LedgerAsync(member, "pageSize=50")).Items, item => item.Kind == "group").Group!;

        Assert.Equal([last.Id, group.Id, middle.Id, first.Id], newest);
        Assert.Equal([first.Id, middle.Id, group.Id, last.Id], oldest);
        Assert.Equal([first.Id, group.Id, last.Id, middle.Id], byAmount);
        Assert.Equal(("-52.00", 2, 2), (summary.NetReportingAmount, summary.MemberCount, summary.MatchingCount));
        Assert.Equal((new DateOnly(2026, 7, 5), new DateOnly(2026, 7, 15)), (summary.FirstDate, summary.LastDate));
    }

    [Theory]
    [InlineData("category", "asc")]
    [InlineData("category", "desc")]
    [InlineData("account", "asc")]
    [InlineData("account", "desc")]
    public async Task Category_and_account_sorts_put_groups_after_every_transaction(string sort, string direction)
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var other = await CreateAccountAsync(client: member);
        var food = await CreateCategoryAsync(client: member);
        await CreateTransactionAsync(member, account, food, "expense", "5.00", "2026-07-01", "Groceries");
        await CreateTransactionAsync(member, other, null, "expense", "6.00", "2026-07-02", "Uncategorized");
        var a = await CreateTransactionAsync(member, account, food, "expense", "7.00", "2026-07-03", "A");
        var b = await CreateTransactionAsync(member, other, food, "expense", "8.00", "2026-07-04", "B");
        var c = await CreateTransactionAsync(member, account, null, "expense", "9.00", "2026-07-05", "C");
        var d = await CreateTransactionAsync(member, other, null, "expense", "9.50", "2026-07-06", "D");
        var alpha = await CreateGroupAsync(member, "Alpha", [a.Id, b.Id]);
        var beta = await CreateGroupAsync(member, "Beta", [c.Id, d.Id]);

        var order = await OrderAsync(member, $"sort={sort}&direction={direction}");

        Assert.Equal(4, order.Count);
        Assert.Equal(direction == "asc" ? [alpha.Id, beta.Id] : [beta.Id, alpha.Id], order.Skip(2));
    }

    [Fact]
    public async Task A_filter_shows_a_group_when_one_member_matches_and_lists_only_the_matching_members()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var marker = Guid.NewGuid().ToString("N")[..8];
        var hotel = await CreateTransactionAsync(member, account, null, "expense", "40.00", "2026-07-03", $"Hotel {marker}");
        var bus = await CreateTransactionAsync(member, account, null, "expense", "12.00", "2026-07-04", $"Bus {marker}");
        var dinner = await CreateTransactionAsync(member, account, null, "expense", "30.00", "2026-07-05", $"Dinner {marker}");
        var group = await CreateGroupAsync(member, "Trip to Riga", [hotel.Id, bus.Id, dinner.Id]);
        var search = Uri.EscapeDataString($"Bus {marker}");

        var filtered = await LedgerAsync(member, $"search={search}");
        var nothing = await LedgerAsync(member, "search=no-such-row");
        var members = await ReadOkAsync<GroupMembersDto>(
            await member.GetAsync($"{GroupsUrl}/{group.Id}/members?search={search}", TestContext.Current.CancellationToken));
        var everyone = await ReadOkAsync<GroupMembersDto>(
            await member.GetAsync($"{GroupsUrl}/{group.Id}/members", TestContext.Current.CancellationToken));

        var item = Assert.Single(filtered.Items);
        Assert.Equal("group", item.Kind);
        Assert.Equal((1, 3, "-12.00"), (item.Group!.MatchingCount, item.Group.MemberCount, item.Group.NetReportingAmount));
        Assert.Equal((new DateOnly(2026, 7, 4), new DateOnly(2026, 7, 4)), (item.Group.FirstDate, item.Group.LastDate));
        Assert.Empty(nothing.Items);
        Assert.Equal([bus.Id], members.Items.Select(t => t.Id));
        Assert.False(members.Truncated);
        Assert.Equal([dinner.Id, bus.Id, hotel.Id], everyone.Items.Select(t => t.Id));
        Assert.All(everyone.Items, t => Assert.Equal((group.Id, true), (t.GroupId, t.EnteredByMe)));
    }

    [Fact]
    public async Task Grouping_changes_neither_the_summary_the_exports_the_reports_the_budgets_nor_the_transactions_list()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("500.00", client: member);
        var food = await CreateCategoryAsync(client: member);
        var salary = await CreateCategoryAsync("income", member);
        await Seed.BudgetAsync(member, food, "200.00");
        var month = new DateOnly(Today.Year, Today.Month, 1);
        var day = month.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        var rows = new[]
        {
            await CreateTransactionAsync(member, account, food, "expense", "40.00", day, "Hotel"),
            await CreateTransactionAsync(member, account, food, "expense", "12.00", day, "Bus"),
            await CreateTransactionAsync(member, account, salary, "income", "300.00", day, "Salary"),
            await CreateTransactionAsync(member, account, food, "expense", "5.00", day, "Coffee"),
        };
        var range = $"dateFrom={day}&dateTo={month.AddMonths(1).AddDays(-1):yyyy-MM-dd}";
        var before = await FiguresAsync(member, account, range);

        await CreateGroupAsync(member, "Trip to Riga", [rows[0].Id, rows[1].Id, rows[2].Id]);
        var grouped = await FiguresAsync(member, account, range);

        Assert.Equal(before with { Csv = grouped.Csv }, grouped);
        Assert.Equal(StripGroup(before.Csv), StripGroup(grouped.Csv));
        Assert.Equal(3, grouped.Csv.Count(line => line.EndsWith(",Trip to Riga", StringComparison.Ordinal)));
        Assert.Equal(before.Balance, await CurrentBalanceAsync(account, member));
    }

    [Fact]
    public async Task A_closed_month_does_not_drift_when_its_rows_are_grouped_ungrouped_or_restored()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var food = await CreateCategoryAsync(client: member);
        var hotel = await CreateTransactionAsync(member, account, food, "expense", "40.00", "2025-03-04", "Hotel");
        var bus = await CreateTransactionAsync(member, account, food, "expense", "12.00", "2025-03-05", "Bus");
        var dinner = await CreateTransactionAsync(member, account, food, "expense", "30.00", "2025-03-06", "Dinner");
        (await member.PostAsJsonAsync("/api/month-close/2025-03", new { note = (string?)null }, TestContext.Current.CancellationToken))
            .EnsureSuccessStatusCode();
        var stamps = await UpdatedAtAsync([hotel.Id, bus.Id, dinner.Id]);

        var group = await CreateGroupAsync(member, "Trip to Riga", [hotel.Id, bus.Id]);
        (await member.PostAsJsonAsync($"{GroupsUrl}/{group.Id}/members", new { transactionIds = new[] { dinner.Id } }, TestContext.Current.CancellationToken))
            .EnsureSuccessStatusCode();
        (await member.DeleteAsync($"{GroupsUrl}/{group.Id}/members/{dinner.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var whileGrouped = await StatusAsync(member);
        (await member.DeleteAsync($"{GroupsUrl}/{group.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var afterUngroup = await StatusAsync(member);
        (await member.PostAsJsonAsync("/api/trash/restore", new { kind = "transactionGroup", entityId = group.Id }, TestContext.Current.CancellationToken))
            .EnsureSuccessStatusCode();

        Assert.Equal(("closed", "closed", "closed"), (whileGrouped, afterUngroup, await StatusAsync(member)));
        Assert.Equal(stamps, await UpdatedAtAsync([hotel.Id, bus.Id, dinner.Id]));
    }

    private static async Task<TransactionGroupDto> CreateGroupAsync(HttpClient client, string name, IEnumerable<Guid> transactionIds) =>
        await PostAsync<TransactionGroupDto>(client, GroupsUrl, new { name, transactionIds = transactionIds.ToArray() });

    private static async Task<PageDto<LedgerItemDto>> LedgerAsync(HttpClient client, string query) =>
        (await client.GetFromJsonAsync<PageDto<LedgerItemDto>>($"/api/transactions/ledger?{query}", TestContext.Current.CancellationToken))!;

    private static async Task<List<Guid>> OrderAsync(HttpClient client, string query) =>
        [.. (await LedgerAsync(client, $"{query}&pageSize=50")).Items.Select(item => item.Group?.Id ?? item.Transaction!.Id)];

    private async Task<Figures> FiguresAsync(HttpClient client, Guid account, string range)
    {
        async Task<string> Text(string url) =>
            await client.GetStringAsync(url, TestContext.Current.CancellationToken);

        var list = (await client.GetFromJsonAsync<PageDto<TransactionDto>>($"/api/transactions?{range}&pageSize=50", TestContext.Current.CancellationToken))!;
        var pdf = await client.GetAsync($"/api/transactions/export/pdf?{range}", TestContext.Current.CancellationToken);
        return new Figures(
            await Text($"/api/transactions/summary?{range}"),
            await Text($"/api/reports/summary?{range}"),
            await Text("/api/budgets"),
            string.Join(";", list.Items.Select(t => $"{t.Id}:{t.Amount}:{t.Type}:{t.CategoryId}")),
            pdf.IsSuccessStatusCode,
            await CurrentBalanceAsync(account, client),
            [.. (await Text($"/api/transactions/export?{range}")).Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)]);
    }

    private static List<string> StripGroup(IEnumerable<string> csv) =>
        [.. csv.Select(line => line[..line.LastIndexOf(',')])];

    private static async Task<string> StatusAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<ReviewDto>("/api/month-close/2025-03", TestContext.Current.CancellationToken))!.Status;

    private async Task<List<DateTimeOffset>> UpdatedAtAsync(Guid[] ids)
    {
        List<DateTimeOffset> stamps = [];
        foreach (var id in ids)
        {
            stamps.Add(await SqlValueAsync<DateTimeOffset>($"""SELECT "UpdatedAt" AS "Value" FROM "Transactions" WHERE "Id" = {id}"""));
        }

        return stamps;
    }

    private sealed record Figures(
        string Summary,
        string Report,
        string Budgets,
        string Transactions,
        bool PdfExported,
        string Balance,
        List<string> Csv);

    private sealed record ReviewDto(string Status);
}
