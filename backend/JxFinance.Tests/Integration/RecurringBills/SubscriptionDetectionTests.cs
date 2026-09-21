using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using JxFinance.Common.Subscriptions;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.RecurringBills;

[Collection<IntegrationCollection>]
public sealed class SubscriptionDetectionTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task A_monthly_expense_of_the_same_amount_becomes_a_candidate()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var category = await CreateCategoryAsync(client: member);
        var name = UniqueName();
        var dates = MonthlyDates(3);
        var noisy = new[]
        {
            $"{name.ToUpperInvariant()}   100200300",
            $"{name.ToLowerInvariant()} *100200301",
            $"{name} 2026-01-15",
        };
        for (var index = 0; index < dates.Count; index++)
        {
            await SpendAsync(member, account, "9.99", dates[index], noisy[index], category);
        }

        var candidate = await CandidateAsync(member, name);

        Assert.Equal(account, candidate.AccountId);
        Assert.Equal(category, candidate.CategoryId);
        Assert.Equal("monthly", candidate.Cadence);
        Assert.Equal("9.99", candidate.TypicalAmount);
        Assert.Equal(dates, candidate.OccurrenceDates.Select(Iso).ToList());
        Assert.Equal(Iso(NextMonthAfter(dates[^1])), Iso(candidate.NextExpectedDate));
    }

    [Fact]
    public async Task Amounts_that_drift_a_little_are_still_one_subscription()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var name = UniqueName();
        var amounts = new[] { "9.99", "10.49", "10.99" };
        var dates = MonthlyDates(3);
        for (var index = 0; index < dates.Count; index++)
        {
            await SpendAsync(member, account, amounts[index], dates[index], $"{name} 2026-0{index + 1}-11");
        }

        var candidate = await CandidateAsync(member, name);

        Assert.Equal("10.49", candidate.TypicalAmount);
    }

    [Fact]
    public async Task An_amount_that_swings_wildly_is_not_a_subscription()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var name = UniqueName();
        var amounts = new[] { "20.00", "60.00", "140.00" };
        var dates = MonthlyDates(3);
        for (var index = 0; index < dates.Count; index++)
        {
            await SpendAsync(member, account, amounts[index], dates[index], name);
        }

        Assert.Null(await FindAsync(member, name));
    }

    [Fact]
    public async Task Two_occurrences_are_not_enough()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var name = UniqueName();
        foreach (var date in MonthlyDates(2))
        {
            await SpendAsync(member, account, "9.99", date, name);
        }

        Assert.Null(await FindAsync(member, name));
    }

    [Fact]
    public async Task An_active_recurring_entry_of_the_same_name_hides_the_candidate()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var name = UniqueName();
        foreach (var date in MonthlyDates(3))
        {
            await SpendAsync(member, account, "9.99", date, name);
        }

        Assert.NotNull(await FindAsync(member, name));

        var entry = await PostAsync<IdDto>(
            member,
            "/api/recurring-bills",
            new
            {
                name = $"{name}.",
                shape = "expense",
                kind = "fixed",
                amount = "9.99",
                accountId = account,
                cadence = "monthly",
                nextDueDate = Iso(Today.AddDays(7)),
                remindDaysBefore = 3,
            });

        Assert.Null(await FindAsync(member, name));

        var deactivated = await member.PutAsJsonAsync(
            $"/api/recurring-bills/{entry.Id}",
            new
            {
                id = entry.Id,
                name = $"{name}.",
                shape = "expense",
                kind = "fixed",
                amount = "9.99",
                accountId = account,
                cadence = "monthly",
                nextDueDate = Iso(Today.AddDays(7)),
                remindDaysBefore = 3,
                isActive = false,
            });
        deactivated.EnsureSuccessStatusCode();

        Assert.NotNull(await FindAsync(member, name));
    }

    [Fact]
    public async Task A_dismissal_survives_a_new_payment_in_the_same_group()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var name = UniqueName();
        var dates = MonthlyDates(3);
        foreach (var date in dates)
        {
            await SpendAsync(member, account, "9.99", date, name);
        }

        var candidate = await CandidateAsync(member, name);
        var dismissal = await member.PostAsJsonAsync(
            "/api/recurring-bills/suggestions/dismiss",
            new { accountId = candidate.AccountId, description = candidate.Description });
        Assert.Equal(HttpStatusCode.NoContent, dismissal.StatusCode);

        Assert.Null(await FindAsync(member, name));

        await SpendAsync(member, account, "9.99", Iso(Today), $"{name} 990011");
        Assert.Null(await FindAsync(member, name));

        var again = await member.PostAsJsonAsync(
            "/api/recurring-bills/suggestions/dismiss",
            new { accountId = candidate.AccountId, description = candidate.Description });
        Assert.Equal(HttpStatusCode.NoContent, again.StatusCode);
    }

    [Fact]
    public async Task Payments_older_than_the_look_back_window_are_not_read()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var name = UniqueName();
        var first = Today.AddMonths(-(SubscriptionDetection.LookBackMonths + 3));
        foreach (var date in Monthly(first, 3))
        {
            await SpendAsync(member, account, "9.99", Iso(date), name);
        }

        Assert.Null(await FindAsync(member, name));
    }

    [Fact]
    public async Task A_candidate_belongs_to_the_people_who_can_see_the_account()
    {
        var owner = await CreateUserAsync();
        var stranger = await CreateUserAsync();
        using var ownerClient = await LoginAsync(owner);
        using var strangerClient = await LoginAsync(stranger);
        var account = await CreateAccountAsync(client: ownerClient);
        var name = UniqueName();
        foreach (var date in MonthlyDates(3))
        {
            await SpendAsync(ownerClient, account, "9.99", date, name);
        }

        Assert.NotNull(await FindAsync(ownerClient, name));
        Assert.Null(await FindAsync(strangerClient, name));
    }

    [Fact]
    public async Task A_dismissal_is_personal_to_the_member_who_made_it()
    {
        var owner = await CreateUserAsync();
        var partner = await CreateUserAsync();
        using var ownerClient = await LoginAsync(owner);
        using var partnerClient = await LoginAsync(partner);
        var household = await CreateHouseholdAsync(owner, partner);
        var account = await CreateAccountAsync(householdId: household, client: ownerClient);
        var name = UniqueName();
        foreach (var date in MonthlyDates(3))
        {
            await SpendAsync(ownerClient, account, "9.99", date, name);
        }

        var candidate = await CandidateAsync(partnerClient, name);
        var dismissal = await partnerClient.PostAsJsonAsync(
            "/api/recurring-bills/suggestions/dismiss",
            new { accountId = candidate.AccountId, description = candidate.Description });
        Assert.Equal(HttpStatusCode.NoContent, dismissal.StatusCode);

        Assert.Null(await FindAsync(partnerClient, name));
        Assert.NotNull(await FindAsync(ownerClient, name));
    }

    [Fact]
    public async Task Dismissing_a_candidate_on_an_invisible_account_is_refused()
    {
        var owner = await CreateUserAsync();
        using var ownerClient = await LoginAsync(owner);
        using var stranger = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: ownerClient);

        var response = await stranger.PostAsJsonAsync(
            "/api/recurring-bills/suggestions/dismiss",
            new { accountId = account, description = "netflix com" });

        await AssertRejectedAsync(response, "reference.notFound");
    }

    [Fact]
    public async Task Suggestions_follow_the_recurring_entries_switch()
    {
        using var member = await CreateUserClientAsync();
        var original = (await Client.GetFromJsonAsync<JsonObject>("/api/settings"))!;
        var switchedOff = original.DeepClone().AsObject();
        switchedOff["features"]!["recurringBills"] = false;

        try
        {
            (await Client.PutAsJsonAsync("/api/settings", switchedOff)).EnsureSuccessStatusCode();

            var list = await member.GetAsync("/api/recurring-bills/suggestions");
            var dismissal = await member.PostAsJsonAsync(
                "/api/recurring-bills/suggestions/dismiss",
                new { accountId = Guid.NewGuid(), description = "netflix com" });

            await AssertProblemAsync(list, HttpStatusCode.NotFound, "feature.disabled");
            await AssertProblemAsync(dismissal, HttpStatusCode.NotFound, "feature.disabled");
        }
        finally
        {
            (await Client.PutAsJsonAsync("/api/settings", original)).EnsureSuccessStatusCode();
        }

        (await member.GetAsync("/api/recurring-bills/suggestions")).EnsureSuccessStatusCode();
    }

    private static string UniqueName() => "Subscription " + new string(
        Guid.NewGuid().ToString("N")[..12]
            .Select(character => (char)('a' + Convert.ToInt32(character.ToString(), 16)))
            .ToArray());

    private static string Iso(DateOnly date) => date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    private static DateOnly NextMonthAfter(string date)
    {
        var last = DateOnly.ParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture);
        return last.AddMonths(1);
    }

    private static IEnumerable<DateOnly> Monthly(DateOnly first, int count) =>
        Enumerable.Range(0, count).Select(step => first.AddMonths(step));

    private List<string> MonthlyDates(int count) =>
        Monthly(Today.AddMonths(-count), count).Select(Iso).ToList();

    private static Task SpendAsync(
        HttpClient client,
        Guid account,
        string amount,
        string date,
        string description,
        Guid? categoryId = null) =>
        CreateTransactionAsync(client, account, categoryId, "expense", amount, date, description);

    private static async Task<CandidateDto?> FindAsync(HttpClient client, string name)
    {
        var expected = SubscriptionDescription.Normalize(name);
        var candidates = await client.GetFromJsonAsync<List<CandidateDto>>("/api/recurring-bills/suggestions");
        return candidates!.SingleOrDefault(c => c.Description == expected);
    }

    private static async Task<CandidateDto> CandidateAsync(HttpClient client, string name)
    {
        var candidate = await FindAsync(client, name);
        Assert.NotNull(candidate);
        return candidate;
    }

    private sealed record CandidateDto(
        string Description,
        Guid AccountId,
        Guid? CategoryId,
        string Cadence,
        string TypicalAmount,
        List<DateOnly> OccurrenceDates,
        DateOnly NextExpectedDate);
}
