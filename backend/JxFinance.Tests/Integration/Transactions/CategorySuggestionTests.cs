using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Transactions;

[Collection<IntegrationCollection>]
public sealed class CategorySuggestionTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const string SuggestUrl = "/api/transactions/suggest-category";
    private const string UncategorizedUrl = "/api/transactions/uncategorized-suggestions";

    [Fact]
    public async Task The_form_suggestion_learns_from_history_and_a_rule_beats_it()
    {
        await using var on = await LearnedCategoriesOnAsync();
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("500.00", client: member);
        var groceries = await CreateCategoryAsync(client: member);
        var snacks = await CreateCategoryAsync(client: member);
        await HistoryAsync(member, account, groceries, "MAXIMA LT 0412 VILNIUS", 4);

        var learned = await SuggestAsync(member, account, "MAXIMA LT 0518 VILNIUS");
        await Seed.RuleAsync(member, "startsWith", "MAXIMA LT 0518", categoryId: snacks, name: "Maxima snacks");
        var ruled = await SuggestAsync(member, account, "MAXIMA LT 0518 VILNIUS");
        var unknown = await SuggestAsync(member, account, "Something never seen");

        Assert.Equal((groceries, "learned", (string?)null), (learned.CategoryId, learned.Source, learned.RuleName));
        Assert.InRange(learned.Confidence!.Value, 0.80m, 1m);
        Assert.Equal(new SuggestionDto(snacks, "rule", "Maxima snacks", null), ruled);
        Assert.Equal(new SuggestionDto(null, null, null, null), unknown);
    }

    [Fact]
    public async Task The_form_suggestion_refuses_an_unknown_account_and_answers_only_rules_while_the_switch_is_off()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("500.00", client: member);
        var groceries = await CreateCategoryAsync(client: member);
        var snacks = await CreateCategoryAsync(client: member);
        await HistoryAsync(member, account, groceries, "MAXIMA LT 0412 VILNIUS", 4);
        await Seed.RuleAsync(member, "startsWith", "KIOSK", categoryId: snacks, name: "Kiosk");
        using var stranger = await CreateUserClientAsync();
        var strangersAccount = await CreateAccountAsync("500.00", client: stranger);

        var ruled = await SuggestAsync(member, account, "KIOSK NARVESEN");
        var unguessed = await SuggestAsync(member, account, "MAXIMA LT 0518 VILNIUS");
        var unknown = await PostSuggestAsync(member, strangersAccount, "MAXIMA");

        Assert.Equal(new SuggestionDto(snacks, "rule", "Kiosk", null), ruled);
        Assert.Equal(new SuggestionDto(null, null, null, null), unguessed);
        await AssertProblemAsync(unknown, HttpStatusCode.BadRequest, "reference.notFound");
    }

    [Fact]
    public async Task A_housemates_rows_on_a_shared_account_train_the_guess_but_their_personal_category_is_never_suggested()
    {
        await using var on = await LearnedCategoriesOnAsync();
        using var pair = await CreateHouseholdPairAsync();
        var shared = await CreateAccountAsync("500.00", householdId: pair.HouseholdId, client: pair.OwnerClient);
        var household = await SharedCategoryAsync(pair.OwnerClient, pair.HouseholdId);
        var partnersOwn = await CreateCategoryAsync(client: pair.PartnerClient);
        await HistoryAsync(pair.PartnerClient, shared, household, "IKI ANTAKALNIS 0021", 4);
        await HistoryAsync(pair.PartnerClient, shared, partnersOwn, "PHARMACY BENU 0451", 4);

        var trained = await SuggestAsync(pair.OwnerClient, shared, "IKI ANTAKALNIS 0099");
        var hidden = await SuggestAsync(pair.OwnerClient, shared, "PHARMACY BENU 0777");

        Assert.Equal(household, trained.CategoryId);
        Assert.Null(hidden.CategoryId);
    }

    [Fact]
    public async Task The_active_household_narrows_the_rows_the_guess_learns_from()
    {
        await using var on = await LearnedCategoriesOnAsync();
        using var pair = await CreateHouseholdPairAsync();
        var shared = await CreateAccountAsync("500.00", householdId: pair.HouseholdId, client: pair.OwnerClient);
        var elsewhere = await CreateAccountAsync("500.00", householdId: await Seed.HouseholdAsync(pair.OwnerClient), client: pair.OwnerClient);
        var category = await CreateCategoryAsync(client: pair.OwnerClient);
        await HistoryAsync(pair.OwnerClient, elsewhere, category, "BOLT RIDE 0012", 4);

        var everything = await SuggestAsync(pair.OwnerClient, shared, "BOLT RIDE 0013");
        var scoped = await ReadOkAsync<SuggestionDto>(await SendScopedAsync(
            pair.OwnerClient,
            HttpMethod.Post,
            SuggestUrl,
            pair.HouseholdId,
            new { accountId = shared, type = "expense", amount = "9.00", description = "BOLT RIDE 0013" }));

        Assert.Equal(category, everything.CategoryId);
        Assert.Null(scoped.CategoryId);
    }

    [Fact]
    public async Task The_review_takes_at_most_200_uncategorized_unsplit_rows_newest_first_and_follows_the_ledger_filter()
    {
        await using var on = await LearnedCategoriesOnAsync();
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("5000.00", client: member);
        var other = await CreateAccountAsync("5000.00", client: member);
        var coffee = await CreateCategoryAsync(client: member);
        var filed = await CreateCategoryAsync(client: member);
        await Seed.RuleAsync(member, "startsWith", "COFFEE", categoryId: coffee, name: "Coffee");
        var oldest = await CreateTransactionAsync(member, account, null, "expense", "2.50", DateText(400), "COFFEE oldest");
        for (var day = 1; day <= 200; day++)
        {
            await CreateTransactionAsync(member, account, null, "expense", "2.50", DateText(day), $"COFFEE {day}");
        }

        var categorized = await CreateTransactionAsync(member, other, filed, "expense", "3.00", DateText(1), "COFFEE filed");
        var split = await RecordTransactionAsync(member, new
        {
            accountId = other,
            type = "expense",
            amount = "4.00",
            date = DateText(1),
            description = "COFFEE split",
            lines = new object[] { new { amount = "1.00" }, new { amount = "3.00" } },
        });
        var otherAccount = await CreateTransactionAsync(member, other, null, "expense", "3.50", DateText(2), "COFFEE other");

        var all = await UncategorizedAsync(member, "?uncategorized=true");
        var narrowed = await UncategorizedAsync(member, $"?uncategorized=true&accountId={other}");

        Assert.Equal(200, all.Count);
        Assert.DoesNotContain(all, item => item.Transaction.Id == oldest.Id);
        Assert.Contains(all, item => item.Transaction.Id == otherAccount.Id);
        Assert.All(all, item => Assert.Equal((coffee, "rule", "Coffee"), (item.CategoryId, item.Source, item.RuleName)));
        Assert.Equal(all.Select(item => item.Transaction.Date).OrderDescending(), all.Select(item => item.Transaction.Date));
        Assert.Equal([otherAccount.Id], narrowed.Select(item => item.Transaction.Id));
        Assert.DoesNotContain(all, item => item.Transaction.Id == categorized.Id || item.Transaction.Id == split.Id);
    }

    [Fact]
    public async Task The_review_answers_feature_disabled_while_the_switch_is_off()
    {
        using var member = await CreateUserClientAsync();

        var response = await member.GetAsync(UncategorizedUrl, TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, HttpStatusCode.NotFound, "feature.disabled");
    }

    private async Task HistoryAsync(HttpClient client, Guid account, Guid category, string description, int count)
    {
        for (var week = 1; week <= count; week++)
        {
            await CreateTransactionAsync(client, account, category, "expense", "11.20", DateText(week * 7), description);
        }
    }

    private string DateText(int daysAgo) => Today.AddDays(-daysAgo).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    private static async Task<Guid> SharedCategoryAsync(HttpClient client, Guid householdId) =>
        (await PostAsync<IdDto>(
            client,
            "/api/categories",
            new { name = $"Category {Guid.NewGuid():N}", type = "expense", scope = "shared", householdId })).Id;

    private static Task<HttpResponseMessage> PostSuggestAsync(HttpClient client, Guid account, string description) =>
        client.PostAsJsonAsync(
            SuggestUrl,
            new { accountId = account, type = "expense", amount = "9.00", description },
            TestContext.Current.CancellationToken);

    private static async Task<SuggestionDto> SuggestAsync(HttpClient client, Guid account, string description) =>
        await ReadOkAsync<SuggestionDto>(await PostSuggestAsync(client, account, description));

    private static async Task<List<UncategorizedDto>> UncategorizedAsync(HttpClient client, string query) =>
        await ReadOkAsync<List<UncategorizedDto>>(await client.GetAsync(UncategorizedUrl + query, TestContext.Current.CancellationToken));

    private sealed record SuggestionDto(Guid? CategoryId, string? Source, string? RuleName, decimal? Confidence);

    private sealed record UncategorizedDto(TransactionDto Transaction, Guid CategoryId, string Source, string? RuleName, decimal? Confidence);
}
