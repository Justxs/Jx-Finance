using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using JxFinance.Domain.Common;
using JxFinance.Domain.RecurringBills;
using JxFinance.Tests.Support;
using Microsoft.Extensions.DependencyInjection;

namespace JxFinance.Tests.Integration.RecurringBills;

[Collection<IntegrationCollection>]
public sealed class BillsCalendarTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const string Url = "/api/recurring-bills/calendar";

    [Fact]
    public async Task A_monthly_entry_appears_once_and_a_weekly_one_every_week()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: client);
        var first = NextMonthStart();
        var monthly = await BillAsync(client, "Rent", "expense", "500.00", account, first.AddDays(9));
        var weekly = await BillAsync(client, "Cleaner", "expense", "20.00", account, first, cadence: "weekly");

        var calendar = await CalendarAsync(client, first);

        var days = DateTime.DaysInMonth(first.Year, first.Month);
        Assert.Equal((first, first.AddDays(days - 1)), (calendar.From, calendar.To));
        Assert.Equal(first.AddDays(9), Assert.Single(calendar.Occurrences, o => o.BillId == monthly).Date);
        var weeks = calendar.Occurrences.Where(o => o.BillId == weekly).ToList();
        Assert.Equal(((days - 1) / 7) + 1, weeks.Count);
        Assert.All(weeks, o => Assert.Equal(("due", "20.00", "eur"), (o.Status, o.Amount, o.Currency)));
        Assert.True(weeks[0].IsNextDue);
        Assert.False(weeks[1].IsNextDue);
        Assert.Equal("500.00", Assert.Single(calendar.Occurrences, o => o.BillId == monthly).Amount);
    }

    [Fact]
    public async Task A_variable_entry_carries_the_median_estimate()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: client);
        var first = NextMonthStart();
        var bill = await BillAsync(client, "Water", "expense", null, account, first.AddDays(4), kind: "variable", matchKey: "VILNIAUS VANDENYS");
        await CreateTransactionAsync(client, account, null, "expense", "20.00", Iso(Today.AddDays(-60)), "VILNIAUS VANDENYS 554433");
        await CreateTransactionAsync(client, account, null, "expense", "23.00", Iso(Today.AddDays(-30)), "Vilniaus vandenys 998877");

        var calendar = await CalendarAsync(client, first);

        var occurrence = Assert.Single(calendar.Occurrences, o => o.BillId == bill);
        Assert.Equal(("21.50", true, "due"), (occurrence.Amount, occurrence.Estimated, occurrence.Status));
        Assert.Equal("21.50", calendar.ExpectedOut);
        Assert.True(calendar.Partial);
    }

    [Fact]
    public async Task An_overdue_occurrence_is_paid_by_a_matching_bank_row_but_stays_unconfirmed()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: client);
        var due = Today.AddDays(-3);
        var bill = await BillAsync(client, "Internet", "expense", "30.00", account, due);

        var before = Assert.Single((await CalendarAsync(client, due)).Occurrences, o => o.BillId == bill);
        var row = await CreateTransactionAsync(client, account, null, "expense", "31.00", Iso(due.AddDays(-1)), "INTERNET 20391");
        var after = await CalendarAsync(client, due);

        Assert.Equal(("overdue", true, false), (before.Status, before.IsNextDue, before.Unconfirmed));
        var paid = Assert.Single(after.Occurrences, o => o.BillId == bill);
        Assert.Equal(("paid", true, "31.00"), (paid.Status, paid.Unconfirmed, paid.Amount));
        Assert.Equal((row.Id, account), (paid.TransactionId!.Value, paid.AccountId!.Value));
        Assert.Equal("31.00", after.PaidOut);
        Assert.Equal("30.00", after.ExpectedOut);
    }

    [Fact]
    public async Task A_past_occurrence_without_a_row_is_no_match_and_a_confirmed_one_is_paid()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: client);
        var due = Today.AddDays(10);
        var bill = await BillAsync(client, "Phone", "expense", "15.00", account, due);
        await BackdateAsync(bill, Today.AddDays(-200));
        var lastMonth = RecurringBill.Retreat(due, RecurringBillCadence.Monthly, due.Day);
        var twoMonthsAgo = RecurringBill.Retreat(lastMonth, RecurringBillCadence.Monthly, due.Day);
        await CreateTransactionAsync(client, account, null, "expense", "15.00", Iso(lastMonth), "Phone");

        var missed = Assert.Single((await CalendarAsync(client, twoMonthsAgo)).Occurrences, o => o.BillId == bill);
        var confirmed = Assert.Single((await CalendarAsync(client, lastMonth)).Occurrences, o => o.BillId == bill);

        Assert.Equal((twoMonthsAgo, "noMatch", false), (missed.Date, missed.Status, missed.IsNextDue));
        Assert.Equal((lastMonth, "paid", false), (confirmed.Date, confirmed.Status, confirmed.Unconfirmed));
    }

    [Fact]
    public async Task No_occurrence_is_shown_before_the_entry_was_created()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: client);
        var due = Today.AddDays(10);
        var bill = await BillAsync(client, "Gym", "expense", "25.00", account, due);

        var calendar = await CalendarAsync(client, Today.AddMonths(-3));

        Assert.DoesNotContain(calendar.Occurrences, o => o.BillId == bill);
    }

    [Fact]
    public async Task An_inactive_entry_is_left_out()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: client);
        var first = NextMonthStart();
        var bill = await BillAsync(client, "Paused", "expense", "10.00", account, first.AddDays(3));
        var response = await client.PutAsJsonAsync(
            $"/api/recurring-bills/{bill}",
            new
            {
                name = "Paused",
                shape = "expense",
                kind = "fixed",
                amount = "10.00",
                accountId = account,
                cadence = "monthly",
                nextDueDate = first.AddDays(3),
                remindDaysBefore = 0,
                isActive = false,
            },
            TestContext.Current.CancellationToken);
        response.EnsureSuccessStatusCode();

        var calendar = await CalendarAsync(client, first);

        Assert.DoesNotContain(calendar.Occurrences, o => o.BillId == bill);
    }

    [Fact]
    public async Task A_foreign_currency_entry_without_a_rate_makes_the_totals_partial()
    {
        using var client = await CreateUserClientAsync();
        var kronor = await CreateAccountAsync("1000.00", currency: "sek", client: client);
        var first = NextMonthStart();
        var bill = await BillAsync(client, "Swedish gym", "expense", "300.00", kronor, first.AddDays(2));

        var calendar = await CalendarAsync(client, first);

        var occurrence = Assert.Single(calendar.Occurrences, o => o.BillId == bill);
        Assert.Equal(("300.00", "sek", false), (occurrence.Amount, occurrence.Currency, occurrence.Estimated));
        Assert.Equal(("0.00", true), (calendar.ExpectedOut, calendar.Partial));
    }

    [Fact]
    public async Task An_entry_without_an_account_is_shown_without_an_amount_and_counted_as_unpriced()
    {
        using var client = await CreateUserClientAsync();
        var first = NextMonthStart();
        var bill = await BillAsync(client, "Cash lessons", "expense", "40.00", null, first.AddDays(5));

        var calendar = await CalendarAsync(client, first);

        var occurrence = Assert.Single(calendar.Occurrences, o => o.BillId == bill);
        Assert.Equal((null, null, false), (occurrence.Amount, occurrence.Currency, occurrence.AccountNotVisible));
        Assert.Equal((1, "0.00", false), (calendar.Unpriced, calendar.ExpectedOut, calendar.Partial));
    }

    [Fact]
    public async Task Transfers_stay_out_of_the_totals()
    {
        using var client = await CreateUserClientAsync();
        var main = await CreateAccountAsync("1000.00", client: client);
        var savings = await CreateAccountAsync("0.00", client: client);
        var first = NextMonthStart();
        var transfer = await BillAsync(client, "Saving", "transfer", "100.00", main, first.AddDays(1), toAccountId: savings);
        await BillAsync(client, "Rent", "expense", "30.00", main, first.AddDays(2));
        await BillAsync(client, "Salary", "income", "200.00", main, first.AddDays(3));

        var calendar = await CalendarAsync(client, first);

        Assert.Equal("100.00", Assert.Single(calendar.Occurrences, o => o.BillId == transfer).Amount);
        Assert.Equal(("30.00", "200.00", "0.00", 0), (calendar.ExpectedOut, calendar.ExpectedIn, calendar.PaidOut, calendar.Unpriced));
    }

    [Fact]
    public async Task A_household_entry_appears_for_the_partner_and_the_active_household_narrows_it()
    {
        using var pair = await CreateHouseholdPairAsync();
        var shared = await CreateAccountAsync("100.00", householdId: pair.HouseholdId, client: pair.OwnerClient);
        var other = await Seed.HouseholdAsync(pair.OwnerClient);
        var first = NextMonthStart();
        var bill = await BillAsync(pair.OwnerClient, "Shared rent", "expense", "400.00", shared, first.AddDays(4), householdId: pair.HouseholdId);

        var partner = await CalendarAsync(pair.PartnerClient, first);
        var narrowed = await GetScopedAsync<CalendarDto>(pair.OwnerClient, $"{Url}?month={Month(first)}", other);
        var household = await GetScopedAsync<CalendarDto>(pair.OwnerClient, $"{Url}?month={Month(first)}", pair.HouseholdId);

        Assert.Equal(("400.00", false), Pick(partner, bill));
        Assert.DoesNotContain(narrowed.Occurrences, o => o.BillId == bill);
        Assert.Equal(("400.00", false), Pick(household, bill));
    }

    [Fact]
    public async Task A_partner_who_cannot_see_the_account_sees_the_entry_without_an_amount()
    {
        using var pair = await CreateHouseholdPairAsync();
        var shared = await CreateAccountAsync("100.00", householdId: pair.HouseholdId, client: pair.OwnerClient);
        var first = NextMonthStart();
        var bill = await BillAsync(pair.OwnerClient, "Shared rent", "expense", "400.00", shared, first.AddDays(4), householdId: pair.HouseholdId);
        Assert.Equal(1, await SqlAsync($"""UPDATE "Accounts" SET "Scope" = 0, "HouseholdId" = NULL WHERE "Id" = {shared}"""));

        var partner = await CalendarAsync(pair.PartnerClient, first);

        Assert.Equal((null, true), Pick(partner, bill));
        Assert.Equal(1, partner.Unpriced);
    }

    [Theory]
    [InlineData("2026-13")]
    [InlineData("september")]
    [InlineData("")]
    public async Task A_bad_month_is_refused(string month)
    {
        using var client = await CreateUserClientAsync();

        var response = await client.GetAsync($"{Url}?month={month}", TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, "month.invalid");
    }

    [Theory]
    [InlineData(13)]
    [InlineData(-13)]
    public async Task A_month_more_than_a_year_away_is_refused(int months)
    {
        using var client = await CreateUserClientAsync();

        var response = await client.GetAsync($"{Url}?month={Month(Today.AddMonths(months))}", TestContext.Current.CancellationToken);
        var edge = await client.GetAsync($"{Url}?month={Month(Today.AddMonths(Math.Sign(months) * 12))}", TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, "range.invalid");
        Assert.Equal(HttpStatusCode.OK, edge.StatusCode);
    }

    [Fact]
    public async Task The_calendar_is_gone_while_recurring_entries_are_off()
    {
        using var client = await CreateUserClientAsync();
        await using var off = await FeatureOffAsync("recurringBills");

        var response = await client.GetAsync($"{Url}?month={Month(Today)}", TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, HttpStatusCode.NotFound, "feature.disabled");
    }

    private DateOnly NextMonthStart() => new DateOnly(Today.Year, Today.Month, 1).AddMonths(1);

    private static string Month(DateOnly date) => date.ToString("yyyy-MM", CultureInfo.InvariantCulture);

    private static string Iso(DateOnly date) => date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    private static (string? Amount, bool AccountNotVisible) Pick(CalendarDto calendar, Guid bill)
    {
        var occurrence = Assert.Single(calendar.Occurrences, o => o.BillId == bill);
        return (occurrence.Amount, occurrence.AccountNotVisible);
    }

    private static async Task<CalendarDto> CalendarAsync(HttpClient client, DateOnly month) =>
        (await client.GetFromJsonAsync<CalendarDto>($"{Url}?month={Month(month)}", TestContext.Current.CancellationToken))!;

    private Task<int> BackdateAsync(Guid bill, DateOnly createdOn) =>
        SqlAsync($"""UPDATE "RecurringBills" SET "CreatedAt" = {Services.GetRequiredService<IClock>().StartOfDay(createdOn)} WHERE "Id" = {bill}""");

    private static async Task<Guid> BillAsync(
        HttpClient client,
        string name,
        string shape,
        string? amount,
        Guid? accountId,
        DateOnly nextDueDate,
        string kind = "fixed",
        string cadence = "monthly",
        Guid? toAccountId = null,
        string? matchKey = null,
        Guid? householdId = null) =>
        (await PostAsync<IdDto>(
            client,
            "/api/recurring-bills",
            new
            {
                name,
                shape,
                kind,
                amount,
                accountId,
                toAccountId,
                cadence,
                nextDueDate,
                remindDaysBefore = 0,
                matchKey,
                scope = householdId is null ? "personal" : "shared",
                householdId,
            })).Id;

    private sealed record CalendarDto(
        DateOnly From,
        DateOnly To,
        string ExpectedOut,
        string ExpectedIn,
        string PaidOut,
        bool Partial,
        int Unpriced,
        List<OccurrenceDto> Occurrences);

    private sealed record OccurrenceDto(
        DateOnly Date,
        Guid BillId,
        string Name,
        string Shape,
        string? Amount,
        string? Currency,
        bool Estimated,
        string Status,
        bool IsNextDue,
        bool Unconfirmed,
        bool AccountNotVisible,
        Guid? AccountId,
        Guid? TransactionId);
}
