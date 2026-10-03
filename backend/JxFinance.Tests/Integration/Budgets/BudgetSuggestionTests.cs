using System.Net;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Budgets;

[Collection<NetWorthCollection>]
public sealed class BudgetSuggestionTests(NetWorthFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task The_monthly_median_comes_from_the_six_complete_months_split_lines_by_share()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync("5000.00", client: client);
        var groceries = await CreateCategoryAsync(client: client);
        var other = await CreateCategoryAsync(client: client);
        var spend = new[] { "100.00", "120.00", null, "140.00", "100.00", "110.00" };
        for (var index = 0; index < spend.Length; index++)
        {
            if (spend[index] is { } amount)
            {
                await SpendAsync(client, account, groceries, amount, MonthStart(index - 6).AddDays(4));
            }
        }

        await SplitSpendAsync(client, account, groceries, other, "50.00", "30.00", MonthStart(-2).AddDays(9));
        await SpendAsync(client, account, groceries, "999.00", Today);

        var suggestion = Single(await SuggestionsAsync(client, "monthly"), groceries);

        Assert.Equal(
            ["100.00", "120.00", "0.00", "140.00", "130.00", "110.00"],
            suggestion.Windows.Select(w => w.Spent));
        Assert.Equal(MonthStart(-6), suggestion.Windows[0].Start);
        Assert.Equal(MonthStart(-5).AddDays(-1), suggestion.Windows[0].End);
        Assert.Equal(MonthStart(0).AddDays(-1), suggestion.Windows[^1].End);
        Assert.Equal(("115.00", "115.00"), (suggestion.Median, suggestion.SuggestedLimit));
        Assert.False(suggestion.IsSteady);
        Assert.Equal("20.00", Single(await SuggestionsAsync(client, "monthly"), other).Windows[^2].Spent);
    }

    [Fact]
    public async Task Months_before_the_first_transaction_are_dropped()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync("5000.00", client: client);
        var category = await CreateCategoryAsync(client: client);
        await SpendAsync(client, account, category, "40.00", MonthStart(-2).AddDays(3));
        await SpendAsync(client, account, category, "60.00", MonthStart(-1).AddDays(3));

        var young = Single(await SuggestionsAsync(client, "monthly"), category);

        Assert.Equal(["40.00", "60.00"], young.Windows.Select(w => w.Spent));
        Assert.Equal((null, null), (young.Median, young.SuggestedLimit));

        await SpendAsync(client, account, category, "50.01", MonthStart(-3).AddDays(20));
        var grown = Single(await SuggestionsAsync(client, "monthly"), category);

        Assert.Equal(MonthStart(-3), grown.Windows[0].Start);
        Assert.Equal(("50.01", "51.00"), (grown.Median, grown.SuggestedLimit));
    }

    [Fact]
    public async Task Six_similar_months_are_steady_and_a_monthly_budget_is_flagged_only_for_its_own_period()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync("5000.00", client: client);
        var monthly = await CreateCategoryAsync(client: client);
        var weekly = await CreateCategoryAsync(client: client);
        foreach (var back in Enumerable.Range(1, 6))
        {
            await SpendAsync(client, account, monthly, "300.00", MonthStart(-back).AddDays(2));
            await SpendAsync(client, account, weekly, "80.00", MonthStart(-back).AddDays(2));
        }

        await SpendAsync(client, account, monthly, "5.00", Today.AddDays(-7));
        await SpendAsync(client, account, weekly, "5.00", Today.AddDays(-7));

        await Seed.BudgetAsync(client, monthly, "300.00", "monthly");
        await Seed.BudgetAsync(client, weekly, "20.00", "weekly");

        var suggestions = await SuggestionsAsync(client, "monthly");
        var weeklyView = await SuggestionsAsync(client, "weekly");

        Assert.Equal("monthly", suggestions.Period);
        Assert.True(Single(suggestions, monthly).IsSteady);
        Assert.True(Single(suggestions, monthly).HasBudget);
        Assert.True(Single(suggestions, weekly).IsSteady);
        Assert.False(Single(suggestions, weekly).HasBudget);
        Assert.False(Single(weeklyView, monthly).HasBudget);
        Assert.True(Single(weeklyView, weekly).HasBudget);
    }

    [Fact]
    public async Task Weekly_windows_follow_the_first_day_of_the_week()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync("5000.00", client: client);
        var category = await CreateCategoryAsync(client: client);
        await SpendAsync(client, account, category, "25.00", Today.AddDays(-70));
        await SpendAsync(client, account, category, "15.00", Today.AddDays(-7));

        foreach (var (setting, firstDay) in new[] { ("monday", DayOfWeek.Monday), ("sunday", DayOfWeek.Sunday) })
        {
            await using var week = await OverrideSettingsAsync(settings => settings["firstDayOfWeek"] = setting);
            var windows = Single(await SuggestionsAsync(client, "weekly"), category).Windows;

            Assert.Equal(6, windows.Count);
            Assert.All(windows, w => Assert.Equal(firstDay, w.Start.DayOfWeek));
            Assert.All(windows, w => Assert.Equal(w.Start.AddDays(6), w.End));
            Assert.Equal(StartOfWeek(Today, firstDay).AddDays(-1), windows[^1].End);
            Assert.Equal("15.00", windows.Single(w => w.Start <= Today.AddDays(-7) && Today.AddDays(-7) <= w.End).Spent);
        }
    }

    [Fact]
    public async Task Spending_on_a_shared_account_counts_and_another_members_personal_account_does_not()
    {
        using var pair = await CreateHouseholdPairAsync();
        var shared = await CreateAccountAsync("1000.00", householdId: pair.HouseholdId, client: pair.OwnerClient);
        var partnerOwn = await CreateAccountAsync("1000.00", client: pair.PartnerClient);
        var category = (await PostAsync<IdDto>(
            pair.OwnerClient,
            "/api/categories",
            new { name = $"Category {Guid.NewGuid():N}", type = "expense", scope = "shared", householdId = pair.HouseholdId })).Id;
        await SpendAsync(pair.PartnerClient, shared, category, "45.00", MonthStart(-1).AddDays(5));
        await SpendAsync(pair.PartnerClient, partnerOwn, category, "70.00", MonthStart(-1).AddDays(5));

        var owner = await GetScopedAsync<SuggestionsDto>(
            pair.OwnerClient,
            "/api/budgets/suggestions?period=monthly",
            pair.HouseholdId);
        var partner = await SuggestionsAsync(pair.PartnerClient, "monthly");

        Assert.Equal("45.00", Assert.Single(Single(owner, category).Windows).Spent);
        Assert.Equal("115.00", Assert.Single(Single(partner, category).Windows).Spent);
    }

    [Fact]
    public async Task A_malformed_period_is_rejected_and_the_switch_hides_the_route()
    {
        using var client = await CreateUserClientAsync();

        var unknown = await client.GetAsync("/api/budgets/suggestions?period=fortnightly", TestContext.Current.CancellationToken);
        await AssertProblemAsync(unknown, HttpStatusCode.BadRequest, "request.malformed");
        await AssertValidationErrorAsync(unknown, "period");

        var empty = await SuggestionsAsync(client, "monthly");
        Assert.Empty(empty.Categories);

        await using (await FeatureOffAsync("budgets"))
        {
            var off = await client.GetAsync("/api/budgets/suggestions?period=monthly", TestContext.Current.CancellationToken);
            await AssertProblemAsync(off, HttpStatusCode.NotFound, "feature.disabled");
        }
    }

    private DateOnly MonthStart(int offset) => new DateOnly(Today.Year, Today.Month, 1).AddMonths(offset);

    private static DateOnly StartOfWeek(DateOnly date, DayOfWeek firstDay) =>
        date.AddDays(-(((int)date.DayOfWeek - (int)firstDay + 7) % 7));

    private static SuggestionDto Single(SuggestionsDto suggestions, Guid category) =>
        suggestions.Categories.Single(c => c.CategoryId == category);

    private static Task<SuggestionsDto> SuggestionsAsync(HttpClient client, string period) =>
        GetScopedAsync<SuggestionsDto>(client, $"/api/budgets/suggestions?period={period}", null);

    private static Task SpendAsync(HttpClient client, Guid account, Guid category, string amount, DateOnly date) =>
        RecordTransactionAsync(client, new { accountId = account, categoryId = category, type = "expense", amount, date });

    private static Task SplitSpendAsync(
        HttpClient client,
        Guid account,
        Guid category,
        Guid other,
        string total,
        string share,
        DateOnly date) =>
        RecordTransactionAsync(
            client,
            new
            {
                accountId = account,
                type = "expense",
                amount = total,
                date,
                lines = new object[]
                {
                    new { categoryId = category, amount = share },
                    new { categoryId = other, amount = "20.00" },
                },
            });

    private sealed record WindowDto(DateOnly Start, DateOnly End, string Spent);

    private sealed record SuggestionDto(
        Guid CategoryId,
        string CategoryName,
        List<WindowDto> Windows,
        string? Median,
        string? SuggestedLimit,
        bool IsSteady,
        bool HasBudget);

    private sealed record SuggestionsDto(string Period, List<SuggestionDto> Categories);
}
