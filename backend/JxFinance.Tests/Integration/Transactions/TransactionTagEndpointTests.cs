using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Transactions;

[Collection<IntegrationCollection>]
public sealed class TransactionTagEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Tags_are_set_when_creating_and_replaced_when_editing()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var holiday = await CreateTagAsync(client: member);
        var reimbursable = await CreateTagAsync(client: member);

        var created = await PostAsync<TransactionDto>(
            member,
            "/api/transactions",
            new { accountId = account, type = "expense", amount = "20.00", date = "2026-06-01", tagIds = new[] { holiday, reimbursable } });

        Assert.Equal(new[] { holiday, reimbursable }.OrderBy(id => id), created.TagIds.OrderBy(id => id));

        var edited = await member.PutAsJsonAsync(
            $"/api/transactions/{created.Id}",
            new { accountId = account, type = "expense", amount = "20.00", date = "2026-06-01", tagIds = new[] { holiday } }, TestContext.Current.CancellationToken);
        edited.EnsureSuccessStatusCode();
        var afterEdit = (await edited.Content.ReadFromJsonAsync<TransactionDto>(TestContext.Current.CancellationToken))!;

        var cleared = await member.PutAsJsonAsync(
            $"/api/transactions/{created.Id}",
            new { accountId = account, type = "expense", amount = "20.00", date = "2026-06-01", tagIds = Array.Empty<Guid>() }, TestContext.Current.CancellationToken);
        cleared.EnsureSuccessStatusCode();
        var reread = await member.GetFromJsonAsync<TransactionDto>($"/api/transactions/{created.Id}", TestContext.Current.CancellationToken);

        Assert.Equal([holiday], afterEdit.TagIds);
        Assert.Empty(reread!.TagIds);
    }

    [Fact]
    public async Task A_tag_that_is_not_visible_is_refused()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var foreignTag = await CreateTagAsync();

        var response = await member.PostAsJsonAsync(
            "/api/transactions",
            new { accountId = account, type = "expense", amount = "5.00", date = "2026-06-02", tagIds = new[] { foreignTag } }, TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, "reference.notFound");
    }

    [Fact]
    public async Task Several_tags_in_the_filter_mean_every_one_of_them()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var holiday = await CreateTagAsync(client: member);
        var reimbursable = await CreateTagAsync(client: member);

        var both = await TaggedAsync(member, account, "2026-07-01", [holiday, reimbursable]);
        var onlyHoliday = await TaggedAsync(member, account, "2026-07-02", [holiday]);
        var untagged = await TaggedAsync(member, account, "2026-07-03", []);

        var byHoliday = await ListAsync(member, $"accountId={account}&tagIds={holiday}");
        var byBoth = await ListAsync(member, $"accountId={account}&tagIds={holiday},{reimbursable}");
        var summary = await member.GetFromJsonAsync<SummaryDto>(
            $"/api/transactions/summary?accountId={account}&tagIds={holiday},{reimbursable}", TestContext.Current.CancellationToken);

        Assert.Equal(
            new[] { both.Id, onlyHoliday.Id }.OrderBy(id => id),
            byHoliday.Items.Select(t => t.Id).OrderBy(id => id));
        Assert.Equal([both.Id], byBoth.Items.Select(t => t.Id).ToList());
        Assert.Equal(1, summary!.Count);
        Assert.DoesNotContain(byHoliday.Items, t => t.Id == untagged.Id);
        Assert.Equal(
            new[] { holiday, reimbursable }.OrderBy(id => id),
            byBoth.Items.Single().TagIds.OrderBy(id => id));
    }

    [Fact]
    public async Task A_malformed_tag_filter_is_refused()
    {
        var response = await Client.GetAsync("/api/transactions?tagIds=not-a-guid", TestContext.Current.CancellationToken);

        await AssertValidationErrorAsync(response, "tagIds");
    }

    [Fact]
    public async Task The_shared_tag_of_a_household_marks_a_shared_transaction_for_every_member()
    {
        var other = await CreateUserAsync();
        var household = await CreateHouseholdAsync(other);
        var account = await CreateAccountAsync("100.00", householdId: household);
        var tag = await CreateTagAsync("Shared errand", household);
        using var member = await LoginAsync(other);

        var entry = await PostAsync<TransactionDto>(
            member,
            "/api/transactions",
            new { accountId = account, type = "expense", amount = "12.00", date = "2026-07-05", tagIds = new[] { tag } });

        var theirs = await ListAsync(member, $"accountId={account}&tagIds={tag}");
        var owners = await ListAsync(Client, $"accountId={account}&tagIds={tag}");

        Assert.Contains(theirs.Items, t => t.Id == entry.Id);
        Assert.Contains(owners.Items, t => t.Id == entry.Id);
    }

    [Fact]
    public async Task An_active_household_hides_a_transaction_the_tag_filter_would_otherwise_find()
    {
        using var member = await CreateUserClientAsync();
        var first = await NewHouseholdAsync(member, "Scope first");
        var second = await NewHouseholdAsync(member, "Scope second");
        var account = await CreateAccountAsync("100.00", householdId: second, client: member);
        var tag = await CreateTagAsync("Scoped", second, member);
        var entry = await PostAsync<TransactionDto>(
            member,
            "/api/transactions",
            new { accountId = account, type = "expense", amount = "7.00", date = "2026-07-06", tagIds = new[] { tag } });

        var inScope = await ScopedListAsync(member, $"tagIds={tag}", second);
        var otherScope = await ScopedListAsync(member, $"tagIds={tag}", first);

        Assert.Contains(inScope.Items, t => t.Id == entry.Id);
        Assert.Empty(otherScope.Items);
    }

    [Fact]
    public async Task Deleting_a_tag_takes_it_off_its_transactions_and_keeps_them()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var category = await CreateCategoryAsync(client: member);
        var tag = await CreateTagAsync(client: member);
        var entry = await PostAsync<TransactionDto>(
            member,
            "/api/transactions",
            new { accountId = account, categoryId = category, type = "expense", amount = "31.00", date = "2026-07-07", tagIds = new[] { tag } });

        var deleted = await member.DeleteAsync($"/api/tags/{tag}", TestContext.Current.CancellationToken);
        var afterDelete = await member.GetFromJsonAsync<TransactionDto>($"/api/transactions/{entry.Id}", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        Assert.Empty(afterDelete!.TagIds);
        Assert.Equal(category, afterDelete.CategoryId);
        Assert.Equal("31.00", afterDelete.Amount);
    }

    [Fact]
    public async Task Bulk_tagging_replaces_the_set_on_every_selected_row_including_splits()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var category = await CreateCategoryAsync(client: member);
        var holiday = await CreateTagAsync(client: member);
        var reimbursable = await CreateTagAsync(client: member);

        var plain = await TaggedAsync(member, account, "2026-08-01", [holiday]);
        var split = await PostAsync<TransactionDto>(
            member,
            "/api/transactions",
            new
            {
                accountId = account,
                type = "expense",
                amount = "40.00",
                date = "2026-08-02",
                lines = new object[] { new { categoryId = category, amount = "40.00" } },
            });

        var response = await member.PostAsJsonAsync(
            "/api/transactions/bulk-tags",
            new { transactionIds = new[] { plain.Id, split.Id }, tagIds = new[] { reimbursable } }, TestContext.Current.CancellationToken);
        response.EnsureSuccessStatusCode();
        var updated = await response.Content.ReadFromJsonAsync<BulkDto>(TestContext.Current.CancellationToken);

        var afterPlain = await member.GetFromJsonAsync<TransactionDto>($"/api/transactions/{plain.Id}", TestContext.Current.CancellationToken);
        var afterSplit = await member.GetFromJsonAsync<TransactionDto>($"/api/transactions/{split.Id}", TestContext.Current.CancellationToken);

        Assert.Equal(2, updated!.Updated);
        Assert.Equal([reimbursable], afterPlain!.TagIds);
        Assert.Equal([reimbursable], afterSplit!.TagIds);
        Assert.True(afterSplit.IsSplit);
        Assert.Single(afterSplit.Lines!);
    }

    [Fact]
    public async Task Bulk_tagging_is_all_or_nothing()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var holiday = await CreateTagAsync(client: member);
        var mine = await TaggedAsync(member, account, "2026-08-03", [holiday]);
        var foreignAccount = await CreateAccountAsync();
        var theirs = await CreateTransactionAsync(Client, foreignAccount, null, "expense", "9.00", "2026-08-03");

        var missing = await member.PostAsJsonAsync(
            "/api/transactions/bulk-tags",
            new { transactionIds = new[] { mine.Id, theirs.Id }, tagIds = Array.Empty<Guid>() }, TestContext.Current.CancellationToken);
        var foreignTag = await CreateTagAsync();
        var invisibleTag = await member.PostAsJsonAsync(
            "/api/transactions/bulk-tags",
            new { transactionIds = new[] { mine.Id }, tagIds = new[] { foreignTag } }, TestContext.Current.CancellationToken);
        var unchanged = await member.GetFromJsonAsync<TransactionDto>($"/api/transactions/{mine.Id}", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
        await AssertProblemAsync(invisibleTag, HttpStatusCode.BadRequest, "reference.notFound");
        Assert.Equal([holiday], unchanged!.TagIds);
    }

    [Fact]
    public async Task The_csv_export_carries_a_tag_column()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var holiday = await CreateTagAsync("Alpha holiday", client: member);
        var reimbursable = await CreateTagAsync("Beta reimbursable", client: member);
        await TaggedAsync(member, account, "2026-08-10", [holiday, reimbursable]);
        await TaggedAsync(member, account, "2026-08-11", []);

        var csv = await member.GetStringAsync($"/api/transactions/export?accountId={account}&sort=date&direction=asc", TestContext.Current.CancellationToken);
        var lines = csv.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        Assert.Equal("Date,Description,Account,Category,Tags,Type,Amount,Currency", lines[0]);
        Assert.Contains("Alpha holiday; Beta reimbursable", lines[1]);
        Assert.DoesNotContain("Alpha holiday", lines[2]);
    }

    [Fact]
    public async Task The_report_breaks_expenses_down_by_tag_and_shows_the_untagged_rest()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var holiday = await CreateTagAsync("Holiday report", client: member);
        var reimbursable = await CreateTagAsync("Reimbursable report", client: member);
        await TaggedAsync(member, account, "2026-05-02", [holiday, reimbursable], "30.00");
        await TaggedAsync(member, account, "2026-05-03", [holiday], "20.00");
        await TaggedAsync(member, account, "2026-05-04", [], "5.00");
        await TaggedAsync(member, account, "2026-09-09", [holiday], "99.00");

        var report = await member.GetFromJsonAsync<ReportDto>("/api/reports/summary?dateFrom=2026-05-01&dateTo=2026-05-31", TestContext.Current.CancellationToken);

        Assert.Equal("50.00", report!.ExpenseByTag.Single(t => t.TagId == holiday).Amount);
        Assert.Equal("30.00", report.ExpenseByTag.Single(t => t.TagId == reimbursable).Amount);
        Assert.Equal("5.00", report.ExpenseByTag.Single(t => t.TagId is null).Amount);
        Assert.Equal("55.00", report.TotalExpense);
    }

    private static async Task<Guid> NewHouseholdAsync(HttpClient client, string name) =>
        (await PostAsync<IdDto>(client, "/api/households", new { name = $"{name} {Guid.NewGuid():N}" })).Id;

    private static Task<TransactionDto> TaggedAsync(
        HttpClient client,
        Guid accountId,
        string date,
        Guid[] tagIds,
        string amount = "10.00") =>
        PostAsync<TransactionDto>(
            client,
            "/api/transactions",
            new { accountId, type = "expense", amount, date, tagIds });

    private static async Task<PageDto<TransactionDto>> ListAsync(HttpClient client, string query) =>
        (await client.GetFromJsonAsync<PageDto<TransactionDto>>($"/api/transactions?pageSize=200&{query}"))!;

    private static async Task<PageDto<TransactionDto>> ScopedListAsync(HttpClient client, string query, Guid household)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"/api/transactions?pageSize=200&{query}");
        request.Headers.Add("X-Active-Household", household.ToString());
        var response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<PageDto<TransactionDto>>())!;
    }

    private sealed record SummaryDto(int Count, string TotalIncome, string TotalExpense);

    private sealed record TagAmountDto(Guid? TagId, string TagName, string Amount);

    private sealed record ReportDto(string TotalExpense, List<TagAmountDto> ExpenseByTag);
}
