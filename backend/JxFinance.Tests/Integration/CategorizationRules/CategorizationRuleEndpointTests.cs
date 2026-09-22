using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json.Nodes;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.CategorizationRules;

[Collection<IntegrationCollection>]
public sealed class CategorizationRuleEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const string SampleCsv =
        "\"Sąskaitos Nr.\",\"\",\"Data\",\"Gavėjas\",\"Paaiškinimai\",\"Suma\",\"Valiuta\",\"D/K\",\"Įrašo Nr.\"\n"
        + "\"LT476300010172306416\",\"20\",\"2026-05-02\",\"LIDL/50191\",\"PIRKINYS LIDL ZIRMUNU\",\"15.77\",\"EUR\",\"D\",\"RULES-{0}-A\"\n"
        + "\"LT476300010172306416\",\"20\",\"2026-05-03\",\"\",\"Salary\",\"1000.00\",\"EUR\",\"K\",\"RULES-{0}-B\"\n";

    [Fact]
    public async Task A_new_user_starts_without_rules()
    {
        using var member = await CreateUserClientAsync();

        var rules = await member.GetFromJsonAsync<List<RuleDto>>("/api/categorization-rules", TestContext.Current.CancellationToken);

        Assert.Empty(rules!);
    }

    [Fact]
    public async Task A_rule_has_to_set_a_category_or_a_tag()
    {
        using var member = await CreateUserClientAsync();

        var response = await member.PostAsJsonAsync(
            "/api/categorization-rules",
            new { name = "Nothing", match = "contains", pattern = "x", tagIds = Array.Empty<Guid>() }, TestContext.Current.CancellationToken);

        await AssertValidationErrorAsync(response, "categoryId");
    }

    [Fact]
    public async Task The_highest_amount_cannot_be_below_the_lowest_one()
    {
        using var member = await CreateUserClientAsync();
        var category = await CreateCategoryAsync(client: member);

        var response = await member.PostAsJsonAsync(
            "/api/categorization-rules",
            new
            {
                name = "Backwards",
                match = "contains",
                pattern = "x",
                tagIds = Array.Empty<Guid>(),
                categoryId = category,
                minAmount = "50.00",
                maxAmount = "10.00",
            }, TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, "range.invalid");
    }

    [Theory]
    [InlineData("contains", "MAXIMA", true)]
    [InlineData("contains", "maxima", true)]
    [InlineData("contains", "LIDL", false)]
    [InlineData("startsWith", "Pirkinys", true)]
    [InlineData("startsWith", "MAXIMA", false)]
    [InlineData("exact", "Pirkinys MAXIMA X-123", true)]
    [InlineData("exact", "MAXIMA", false)]
    public async Task Each_condition_kind_decides_what_a_run_touches(string match, string pattern, bool expected)
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var category = await CreateCategoryAsync(client: member);
        await CreateTransactionAsync(member, account, null, "expense", "12.00", "2026-09-01", "Pirkinys MAXIMA X-123");
        await CreateRuleAsync(member, match, pattern, categoryId: category);

        var preview = await PreviewAsync(member);

        Assert.Equal(expected ? 1 : 0, preview.Total);
    }

    [Fact]
    public async Task A_rule_narrowed_by_account_and_amount_only_touches_rows_inside_it()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var other = await CreateAccountAsync(client: member);
        var category = await CreateCategoryAsync(client: member);
        await CreateTransactionAsync(member, account, null, "expense", "12.00", "2026-09-01", "Kavine Vero");
        await CreateTransactionAsync(member, account, null, "expense", "90.00", "2026-09-02", "Kavine Vero");
        await CreateTransactionAsync(member, other, null, "expense", "12.00", "2026-09-03", "Kavine Vero");
        await CreateRuleAsync(
            member,
            "contains",
            "Kavine",
            categoryId: category,
            accountId: account,
            minAmount: "5.00",
            maxAmount: "20.00");

        var preview = await PreviewAsync(member);

        Assert.Equal(1, preview.Total);
    }

    [Fact]
    public async Task An_expense_rule_never_matches_income()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var expenseCategory = await CreateCategoryAsync(client: member);
        await CreateTransactionAsync(member, account, null, "income", "12.00", "2026-09-01", "Grazinimas");
        await CreateRuleAsync(member, "contains", "Grazinimas", categoryId: expenseCategory);

        var preview = await PreviewAsync(member);

        Assert.Equal(0, preview.Total);
    }

    [Fact]
    public async Task The_first_matching_rule_wins_and_no_later_rule_sees_the_row()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var groceries = await CreateCategoryAsync(client: member);
        var everything = await CreateCategoryAsync(client: member);
        await CreateTransactionAsync(member, account, null, "expense", "12.00", "2026-09-01", "Pirkinys MAXIMA");
        var first = await CreateRuleAsync(member, "contains", "MAXIMA", categoryId: groceries, name: "Groceries");
        var second = await CreateRuleAsync(member, "contains", "Pirkinys", categoryId: everything, name: "Shopping");

        var preview = await PreviewAsync(member);
        var run = await RunAsync(member);
        var transaction = await OneTransactionAsync(member, account);

        Assert.Equal(1, preview.Rules.Single(r => r.RuleId == first).RowCount);
        Assert.Equal(0, preview.Rules.Single(r => r.RuleId == second).RowCount);
        Assert.Equal(1, run.Total);
        Assert.Equal(groceries, transaction.CategoryId);
    }

    [Fact]
    public async Task Moving_a_rule_changes_which_one_wins_and_keeps_the_positions_dense()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var groceries = await CreateCategoryAsync(client: member);
        var everything = await CreateCategoryAsync(client: member);
        await CreateTransactionAsync(member, account, null, "expense", "12.00", "2026-09-01", "Pirkinys MAXIMA");
        await CreateRuleAsync(member, "contains", "MAXIMA", categoryId: groceries, name: "Groceries");
        var second = await CreateRuleAsync(member, "contains", "Pirkinys", categoryId: everything, name: "Shopping");

        var moved = await PostAsync<List<RuleDto>>(
            member,
            $"/api/categorization-rules/{second}/move",
            new { direction = "up" });
        await RunAsync(member);
        var transaction = await OneTransactionAsync(member, account);

        Assert.Equal([0, 1], moved.Select(r => r.Position));
        Assert.Equal(second, moved[0].Id);
        Assert.Equal(everything, transaction.CategoryId);
    }

    [Fact]
    public async Task Moving_the_first_rule_up_changes_nothing_and_still_answers_the_list()
    {
        using var member = await CreateUserClientAsync();
        var category = await CreateCategoryAsync(client: member);
        var first = await CreateRuleAsync(member, "contains", "a", categoryId: category, name: "First");
        var second = await CreateRuleAsync(member, "contains", "b", categoryId: category, name: "Second");

        var moved = await PostAsync<List<RuleDto>>(
            member,
            $"/api/categorization-rules/{first}/move",
            new { direction = "up" });

        Assert.Equal([first, second], moved.Select(r => r.Id));
        Assert.Equal([0, 1], moved.Select(r => r.Position));
    }

    [Fact]
    public async Task Deleting_a_rule_closes_the_gap_in_the_positions()
    {
        using var member = await CreateUserClientAsync();
        var category = await CreateCategoryAsync(client: member);
        var first = await CreateRuleAsync(member, "contains", "a", categoryId: category, name: "First");
        var second = await CreateRuleAsync(member, "contains", "b", categoryId: category, name: "Second");
        var third = await CreateRuleAsync(member, "contains", "c", categoryId: category, name: "Third");

        var deleted = await member.DeleteAsync($"/api/categorization-rules/{second}", TestContext.Current.CancellationToken);
        var rules = await member.GetFromJsonAsync<List<RuleDto>>("/api/categorization-rules", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        Assert.Equal([first, third], rules!.Select(r => r.Id));
        Assert.Equal([0, 1], rules!.Select(r => r.Position));
    }

    [Fact]
    public async Task A_run_leaves_rows_that_already_carry_a_category_alone()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var chosen = await CreateCategoryAsync(client: member);
        var ruleCategory = await CreateCategoryAsync(client: member);
        await CreateTransactionAsync(member, account, chosen, "expense", "12.00", "2026-09-01", "Pirkinys MAXIMA");
        await CreateRuleAsync(member, "contains", "MAXIMA", categoryId: ruleCategory);

        var preview = await PreviewAsync(member);
        var run = await RunAsync(member);
        var transaction = await OneTransactionAsync(member, account);

        Assert.Equal(0, preview.Total);
        Assert.Equal(0, run.Total);
        Assert.Equal(chosen, transaction.CategoryId);
    }

    [Fact]
    public async Task The_recategorize_option_replaces_a_category_that_is_already_there()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var chosen = await CreateCategoryAsync(client: member);
        var ruleCategory = await CreateCategoryAsync(client: member);
        await CreateTransactionAsync(member, account, chosen, "expense", "12.00", "2026-09-01", "Pirkinys MAXIMA");
        await CreateRuleAsync(member, "contains", "MAXIMA", categoryId: ruleCategory);

        var preview = await PreviewAsync(member, recategorize: true);
        var run = await RunAsync(member, recategorize: true);
        var transaction = await OneTransactionAsync(member, account);

        Assert.Equal(1, preview.Total);
        Assert.True(run.Recategorize);
        Assert.Equal(ruleCategory, transaction.CategoryId);
    }

    [Fact]
    public async Task A_run_adds_the_tags_of_the_winning_rule_and_keeps_the_ones_already_on_the_row()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var category = await CreateCategoryAsync(client: member);
        var kept = await CreateTagAsync(client: member);
        var added = await CreateTagAsync(client: member);
        var created = await RecordTransactionAsync(
            member,
            new
            {
                accountId = account,
                type = "expense",
                amount = "12.00",
                date = "2026-09-01",
                description = "Pirkinys MAXIMA",
                tagIds = new[] { kept },
            });
        await CreateRuleAsync(member, "contains", "MAXIMA", categoryId: category, tagIds: [added]);

        await RunAsync(member);
        var transaction = await OneTransactionAsync(member, account);

        Assert.Equal(created.Id, transaction.Id);
        Assert.Equal(new[] { added, kept }.Order(), transaction.TagIds.Order());
    }

    [Fact]
    public async Task A_run_never_touches_a_split_transaction()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var lineCategory = await CreateCategoryAsync(client: member);
        var ruleCategory = await CreateCategoryAsync(client: member);
        await RecordTransactionAsync(
            member,
            new
            {
                accountId = account,
                type = "expense",
                amount = "12.00",
                date = "2026-09-01",
                description = "Pirkinys MAXIMA",
                lines = new[]
                {
                    new { categoryId = lineCategory, amount = "8.00" },
                    new { categoryId = lineCategory, amount = "4.00" },
                },
            });
        await CreateRuleAsync(member, "contains", "MAXIMA", categoryId: ruleCategory);

        var preview = await PreviewAsync(member);
        var recategorizing = await PreviewAsync(member, recategorize: true);

        Assert.Equal(0, preview.Total);
        Assert.Equal(0, recategorizing.Total);
    }

    [Fact]
    public async Task A_rule_is_personal_but_reaches_a_shared_account_its_owner_can_see()
    {
        var owner = await CreateUserAsync();
        var housemate = await CreateUserAsync();
        var household = await CreateHouseholdAsync(owner, housemate);
        using var ownerClient = await LoginAsync(owner);
        using var housemateClient = await LoginAsync(housemate);
        var shared = await CreateAccountAsync(householdId: household, client: ownerClient);
        var category = await CreateCategoryAsync(client: housemateClient);
        await CreateTransactionAsync(ownerClient, shared, null, "expense", "12.00", "2026-09-01", "Pirkinys MAXIMA");
        await CreateRuleAsync(housemateClient, "contains", "MAXIMA", categoryId: category);

        var ownerSeesTheRules = await ownerClient.GetFromJsonAsync<List<RuleDto>>("/api/categorization-rules", TestContext.Current.CancellationToken);
        var ownerPreview = await PreviewAsync(ownerClient);
        var housematePreview = await PreviewAsync(housemateClient);
        await RunAsync(housemateClient);
        var transaction = await OneTransactionAsync(ownerClient, shared);

        Assert.Empty(ownerSeesTheRules!);
        Assert.Equal(0, ownerPreview.Total);
        Assert.Equal(1, housematePreview.Total);
        Assert.Equal(category, transaction.CategoryId);
    }

    [Fact]
    public async Task A_rule_of_another_user_cannot_be_read_moved_or_deleted()
    {
        using var mine = await CreateUserClientAsync();
        using var theirs = await CreateUserClientAsync();
        var category = await CreateCategoryAsync(client: mine);
        var rule = await CreateRuleAsync(mine, "contains", "MAXIMA", categoryId: category);

        var move = await theirs.PostAsJsonAsync($"/api/categorization-rules/{rule}/move", new { direction = "up" }, TestContext.Current.CancellationToken);
        var delete = await theirs.DeleteAsync($"/api/categorization-rules/{rule}", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NotFound, move.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, delete.StatusCode);
    }

    [Fact]
    public async Task A_tag_that_is_not_visible_cannot_be_the_action_of_a_rule()
    {
        using var mine = await CreateUserClientAsync();
        using var theirs = await CreateUserClientAsync();
        var theirTag = await CreateTagAsync(client: theirs);

        var response = await mine.PostAsJsonAsync(
            "/api/categorization-rules",
            new { name = "Not mine", match = "contains", pattern = "x", tagIds = new[] { theirTag } }, TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, "reference.notFound");
    }

    [Fact]
    public async Task A_sample_description_says_what_the_condition_would_do()
    {
        using var member = await CreateUserClientAsync();

        var hit = await PostAsync<TestDto>(
            member,
            "/api/categorization-rules/test",
            new { match = "contains", pattern = "maxima", description = "Pirkinys MAXIMA X-123" });
        var missedOnAmount = await PostAsync<TestDto>(
            member,
            "/api/categorization-rules/test",
            new
            {
                match = "contains",
                pattern = "maxima",
                description = "Pirkinys MAXIMA X-123",
                amount = "90.00",
                maxAmount = "20.00",
            });

        Assert.True(hit.Matches);
        Assert.False(missedOnAmount.Matches);
        Assert.True(missedOnAmount.DescriptionMatches);
        Assert.False(missedOnAmount.AmountMatches);
    }

    [Fact]
    public async Task Per_cent_and_underscore_in_a_pattern_are_literal_characters()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var category = await CreateCategoryAsync(client: member);
        await CreateTransactionAsync(member, account, null, "expense", "12.00", "2026-09-01", "Palukanos 5% metams");
        await CreateTransactionAsync(member, account, null, "expense", "12.00", "2026-09-02", "Palukanos 7 metams");
        await CreateRuleAsync(member, "contains", "5% metams", categoryId: category);

        var preview = await PreviewAsync(member);

        Assert.Equal(1, preview.Total);
    }

    [Fact]
    public async Task Rules_answer_feature_disabled_while_the_switch_is_off_and_the_import_stops_suggesting()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var category = await CreateCategoryAsync(client: member);
        await CreateRuleAsync(member, "contains", "MAXIMA", categoryId: category);
        var original = (await Client.GetFromJsonAsync<JsonObject>("/api/settings", TestContext.Current.CancellationToken))!;
        var switchedOff = original.DeepClone().AsObject();
        switchedOff["features"]!["categorizationRules"] = false;

        try
        {
            (await Client.PutAsJsonAsync("/api/settings", switchedOff, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

            var list = await member.GetAsync("/api/categorization-rules", TestContext.Current.CancellationToken);
            var run = await member.PostAsJsonAsync("/api/categorization-rules/run", new { }, TestContext.Current.CancellationToken);
            var preview = await ImportPreviewAsync(member, account);

            await AssertProblemAsync(list, HttpStatusCode.NotFound, "feature.disabled");
            await AssertProblemAsync(run, HttpStatusCode.NotFound, "feature.disabled");
            Assert.All(preview, row => Assert.Null(row.MatchedRuleName));
        }
        finally
        {
            (await Client.PutAsJsonAsync("/api/settings", original, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        }

        var rules = await member.GetFromJsonAsync<List<RuleDto>>("/api/categorization-rules", TestContext.Current.CancellationToken);
        Assert.Single(rules!);
    }

    [Fact]
    public async Task The_import_preview_carries_the_suggestion_of_the_first_matching_rule()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var category = await CreateCategoryAsync(client: member);
        var tag = await CreateTagAsync(client: member);
        await CreateRuleAsync(member, "contains", "LIDL", categoryId: category, tagIds: [tag], name: "Groceries");

        var rows = await ImportPreviewAsync(member, account);

        var groceries = rows.Single(r => r.Description!.Contains("LIDL", StringComparison.Ordinal));
        var salary = rows.Single(r => r.Description == "Salary");
        Assert.Equal("Groceries", groceries.MatchedRuleName);
        Assert.Equal(category, groceries.SuggestedCategoryId);
        Assert.Equal([tag], groceries.SuggestedTagIds);
        Assert.Null(salary.MatchedRuleName);
        Assert.Empty(salary.SuggestedTagIds);
    }

    [Fact]
    public async Task The_import_writes_the_category_and_tags_the_user_confirmed_not_the_ones_a_rule_suggested()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var suggested = await CreateCategoryAsync(client: member);
        var chosen = await CreateCategoryAsync(client: member);
        var tag = await CreateTagAsync(client: member);
        await CreateRuleAsync(member, "contains", "LIDL", categoryId: suggested, name: "Groceries");
        var rows = await ImportPreviewAsync(member, account);
        var groceries = rows.Single(r => r.Description!.Contains("LIDL", StringComparison.Ordinal));

        var confirmed = await PostAsync<ConfirmDto>(
            member,
            "/api/import/swedbank/confirm",
            new
            {
                accountId = account,
                rows = new[]
                {
                    new
                    {
                        groceries.ImportRef,
                        groceries.Date,
                        groceries.Description,
                        amount = "15.77",
                        type = "expense",
                        categoryId = chosen,
                        tagIds = new[] { tag },
                    },
                },
            });
        var transaction = await OneTransactionAsync(member, account);

        Assert.Equal(1, confirmed.Imported);
        Assert.Equal(chosen, transaction.CategoryId);
        Assert.Equal([tag], transaction.TagIds);
    }

    private static async Task<List<PreviewRowDto>> ImportPreviewAsync(HttpClient client, Guid accountId)
    {
        var csv = string.Format(
            CultureInfo.InvariantCulture,
            SampleCsv,
            Guid.NewGuid().ToString("N")[..8]);

        using var content = new MultipartFormDataContent();
        var file = new ByteArrayContent(Encoding.UTF8.GetBytes(csv));
        file.Headers.ContentType = new MediaTypeHeaderValue("text/csv");
        content.Add(file, "File", "export.csv");
        content.Add(new StringContent(accountId.ToString()), "AccountId");

        var response = await client.PostAsync("/api/import/swedbank/preview", content);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<PreviewDto>())!.Rows;
    }

    private static async Task<Guid> CreateRuleAsync(
        HttpClient client,
        string match,
        string pattern,
        Guid? categoryId = null,
        Guid[]? tagIds = null,
        Guid? accountId = null,
        string? minAmount = null,
        string? maxAmount = null,
        string? name = null) =>
        (await PostAsync<IdDto>(
            client,
            "/api/categorization-rules",
            new
            {
                name = name ?? $"Rule {Guid.NewGuid():N}"[..20],
                match,
                pattern,
                tagIds = tagIds ?? [],
                categoryId,
                accountId,
                minAmount,
                maxAmount,
            })).Id;

    private static Task<RunDto> PreviewAsync(HttpClient client, bool recategorize = false) =>
        PostAsync<RunDto>(client, "/api/categorization-rules/run/preview", new { recategorize });

    private static Task<RunDto> RunAsync(HttpClient client, bool recategorize = false) =>
        PostAsync<RunDto>(client, "/api/categorization-rules/run", new { recategorize });

    private static async Task<LedgerRowDto> OneTransactionAsync(HttpClient client, Guid accountId) =>
        (await client.GetFromJsonAsync<PageDto<LedgerRowDto>>($"/api/transactions?accountId={accountId}"))!
            .Items.Single();

    private sealed record RuleDto(Guid Id, string Name, int Position, Guid? CategoryId, List<Guid> TagIds);

    private sealed record RunRowDto(Guid RuleId, string Name, int RowCount);

    private sealed record RunDto(List<RunRowDto> Rules, int Total, bool Recategorize);

    private sealed record TestDto(bool Matches, bool DescriptionMatches, bool AmountMatches);

    private sealed record LedgerRowDto(Guid Id, Guid? CategoryId, List<Guid> TagIds);

    private sealed record PreviewRowDto(
        string ImportRef,
        DateOnly Date,
        string? Payee,
        string? Description,
        string Amount,
        string Type,
        Guid? SuggestedCategoryId,
        List<Guid> SuggestedTagIds,
        string? MatchedRuleName);

    private sealed record PreviewDto(List<PreviewRowDto> Rows);

    private sealed record ConfirmDto(int Imported, int SkippedDuplicates);
}
