using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using JxFinance.Domain.CategorizationRules;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.CategorizationRules;

[Collection<ImportsCollection>]
public sealed class SuggestedRuleEndpointTests(ImportsFixture fixture) : IntegrationTestBase(fixture)
{
    private const string Suggested = "/api/categorization-rules/suggested";

    [Fact]
    public async Task Three_hand_filed_rows_of_one_payee_make_one_suggestion_and_two_make_none()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var groceries = await CreateCategoryAsync(client: member);
        await FileAsync(member, account, groceries, "MAXIMA X123 VILNIUS", "Maxima X456 Vilnius");

        var withTwo = await SuggestedAsync(member);
        await FileAsync(member, account, groceries, "MAXIMA X789 VILNIUS");
        var withThree = await SuggestedAsync(member);

        Assert.Empty(withTwo);
        var suggestion = Assert.Single(withThree);
        Assert.Equal("startsWith", suggestion.Match);
        Assert.Equal("MAXIMA", suggestion.Pattern);
        Assert.Equal("MAXIMA", suggestion.Name);
        Assert.Equal(groceries, suggestion.CategoryId);
        Assert.Equal(3, suggestion.Evidence);
        Assert.Equal(Today.AddDays(-2), suggestion.LastSeen);
    }

    [Fact]
    public async Task One_row_in_another_category_of_the_same_flow_type_blocks_the_suggestion()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var groceries = await CreateCategoryAsync(client: member);
        var household = await CreateCategoryAsync(client: member);
        await FileAsync(member, account, groceries, "MAXIMA 1", "MAXIMA 2", "MAXIMA 3");
        await CreateTransactionAsync(member, account, household, "expense", "9.00", Day(20), "MAXIMA 4");

        Assert.Empty(await SuggestedAsync(member));
    }

    [Fact]
    public async Task A_row_in_an_income_category_does_not_block_an_expense_suggestion()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var groceries = await CreateCategoryAsync(client: member);
        var refunds = await CreateCategoryAsync("income", member);
        await FileAsync(member, account, groceries, "MAXIMA 1", "MAXIMA 2", "MAXIMA 3");
        await CreateTransactionAsync(member, account, refunds, "income", "9.00", Day(20), "MAXIMA 4");

        var suggestion = Assert.Single(await SuggestedAsync(member));

        Assert.Equal(groceries, suggestion.CategoryId);
    }

    [Fact]
    public async Task Rows_a_rule_already_matches_do_not_count_so_creating_the_suggested_rule_removes_it()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var groceries = await CreateCategoryAsync(client: member);
        await FileAsync(member, account, groceries, "Rimi Akropolis 1", "Rimi Akropolis 22", "RIMI AKROPOLIS 3");
        var suggestion = Assert.Single(await SuggestedAsync(member));

        var created = await member.PostAsJsonAsync(
            "/api/categorization-rules",
            new
            {
                name = suggestion.Name,
                match = suggestion.Match,
                pattern = suggestion.Pattern,
                categoryId = suggestion.CategoryId,
                tagIds = Array.Empty<Guid>(),
            },
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        Assert.Empty(await SuggestedAsync(member));
    }

    [Fact]
    public async Task Only_the_callers_own_rows_count_on_a_shared_account()
    {
        using var pair = await CreateHouseholdPairAsync();
        var (_, _, ownerClient, housemateClient, household) = pair;
        var shared = await CreateAccountAsync(householdId: household, client: ownerClient);
        var housemateCategory = await CreateCategoryAsync(client: housemateClient);
        var ownerCategory = await CreateCategoryAsync(client: ownerClient);
        await FileAsync(housemateClient, shared, housemateCategory, "Lidl 1", "Lidl 2", "Lidl 3");

        var before = await SuggestedAsync(ownerClient);
        await FileAsync(ownerClient, shared, ownerCategory, "Lidl 4", "Lidl 5", "Lidl 6");
        var after = await SuggestedAsync(ownerClient);

        Assert.Empty(before);
        var suggestion = Assert.Single(after);
        Assert.Equal(ownerCategory, suggestion.CategoryId);
        Assert.Equal(3, suggestion.Evidence);
    }

    [Fact]
    public async Task Split_deleted_and_old_rows_do_not_count()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var groceries = await CreateCategoryAsync(client: member);
        var other = await CreateCategoryAsync(client: member);
        await FileAsync(member, account, groceries, "Iki 1", "Iki 2");
        await RecordTransactionAsync(member, new
        {
            accountId = account,
            type = "expense",
            amount = "30.00",
            date = Day(5),
            description = "Iki 3",
            lines = new object[]
            {
                new { categoryId = groceries, amount = "20.00" },
                new { categoryId = other, amount = "10.00" },
            },
        });
        var deleted = await CreateTransactionAsync(member, account, groceries, "expense", "9.00", Day(6), "Iki 4");
        (await member.DeleteAsync($"/api/transactions/{deleted.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        await CreateTransactionAsync(member, account, groceries, "expense", "9.00", Today.AddMonths(-13).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture), "Iki 5");

        Assert.Empty(await SuggestedAsync(member));
    }

    [Fact]
    public async Task A_dismissed_suggestion_stays_hidden_and_dismissing_twice_is_fine()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var groceries = await CreateCategoryAsync(client: member);
        await FileAsync(member, account, groceries, "Norfa 1", "Norfa 2", "Norfa 3");
        var suggestion = Assert.Single(await SuggestedAsync(member));

        var first = await DismissAsync(member, suggestion.Key, groceries);
        var second = await DismissAsync(member, suggestion.Key.ToUpperInvariant(), groceries);
        await FileAsync(member, account, groceries, "Norfa 4");

        Assert.Equal(HttpStatusCode.NoContent, first.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, second.StatusCode);
        Assert.Empty(await SuggestedAsync(member));
    }

    [Fact]
    public async Task A_transaction_id_answers_at_exactly_three_rows_and_not_at_four()
    {
        using var member = await CreateUserClientAsync();
        using var stranger = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var groceries = await CreateCategoryAsync(client: member);
        var ids = await FileAsync(member, account, groceries, "Maxima 1", "Maxima 2");
        var atTwo = await SuggestedAsync(member, ids[1]);
        var third = await FileAsync(member, account, groceries, "Maxima 3");
        var atThree = await SuggestedAsync(member, third[0]);
        var olderRowAtThree = await SuggestedAsync(member, ids[0]);
        var strangerAtThree = await SuggestedAsync(stranger, third[0]);
        var fourth = await FileAsync(member, account, groceries, "Maxima 4");
        var atFour = await SuggestedAsync(member, fourth[0]);

        Assert.Empty(atTwo);
        Assert.Single(atThree);
        Assert.Single(olderRowAtThree);
        Assert.Empty(strangerAtThree);
        Assert.Empty(atFour);
        Assert.Equal(4, Assert.Single(await SuggestedAsync(member)).Evidence);
    }

    [Fact]
    public async Task A_full_rule_list_gets_no_suggestions()
    {
        var user = await CreateUserAsync();
        using var member = await LoginAsync(user);
        var account = await CreateAccountAsync(client: member);
        var groceries = await CreateCategoryAsync(client: member);
        await FileAsync(member, account, groceries, "Vynoteka 1", "Vynoteka 2", "Vynoteka 3");
        await WithDbAsync(user.Id, async db =>
        {
            db.CategorizationRules.AddRange(Enumerable.Range(0, 100).Select(position => new CategorizationRule
            {
                Name = $"Rule {position}",
                Position = position,
                Match = DescriptionMatch.Contains,
                Pattern = $"never {position}",
            }));
            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        });

        Assert.Empty(await SuggestedAsync(member));
    }

    [Fact]
    public async Task Both_routes_answer_feature_disabled_while_the_switch_is_off()
    {
        using var member = await CreateUserClientAsync();
        var groceries = await CreateCategoryAsync(client: member);
        await using (await FeatureOffAsync("categorizationRules"))
        {
            var list = await member.GetAsync(Suggested, TestContext.Current.CancellationToken);
            var dismiss = await DismissAsync(member, "maxima", groceries);

            await AssertProblemAsync(list, HttpStatusCode.NotFound, "feature.disabled");
            await AssertProblemAsync(dismiss, HttpStatusCode.NotFound, "feature.disabled");
        }
    }

    private string Day(int daysAgo) => Today.AddDays(-daysAgo).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    private async Task<List<Guid>> FileAsync(HttpClient client, Guid account, Guid category, params string[] descriptions)
    {
        var ids = new List<Guid>();
        foreach (var description in descriptions)
        {
            var daysAgo = descriptions.Length - ids.Count + 1;
            var created = await CreateTransactionAsync(client, account, category, "expense", "12.00", Day(daysAgo), description);
            ids.Add(created.Id);
        }

        return ids;
    }

    private static async Task<List<SuggestionDto>> SuggestedAsync(HttpClient client, Guid? transactionId = null) =>
        (await client.GetFromJsonAsync<List<SuggestionDto>>(
            transactionId is { } id ? $"{Suggested}?transactionId={id}" : Suggested,
            TestContext.Current.CancellationToken))!;

    private static Task<HttpResponseMessage> DismissAsync(HttpClient client, string key, Guid categoryId) =>
        client.PostAsJsonAsync($"{Suggested}/dismiss", new { key, categoryId }, TestContext.Current.CancellationToken);

    private sealed record SuggestionDto(
        string Key,
        string Name,
        string Match,
        string Pattern,
        Guid CategoryId,
        int Evidence,
        DateOnly LastSeen);
}
