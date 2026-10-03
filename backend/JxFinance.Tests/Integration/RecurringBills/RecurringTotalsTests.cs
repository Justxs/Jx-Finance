using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using JxFinance.Domain.Common;
using JxFinance.Domain.RecurringBills;
using JxFinance.Tests.Support;
using Microsoft.Extensions.DependencyInjection;

namespace JxFinance.Tests.Integration.RecurringBills;

[Collection<ImportsCollection>]
public sealed class RecurringTotalsTests(ImportsFixture fixture) : IntegrationTestBase(fixture)
{
    private const string Url = "/api/recurring-bills/totals";

    [Fact]
    public async Task Each_cadence_is_normalized_to_a_month_and_a_year_and_income_is_summed_apart()
    {
        using var client = await CreateUserClientAsync();
        var main = await CreateAccountAsync("1000.00", client: client);
        var savings = await CreateAccountAsync("0.00", client: client);
        var due = Today.AddDays(3);
        await BillAsync(client, "Cleaner", "expense", "10.00", main, due, cadence: "weekly");
        await BillAsync(client, "Phone", "expense", "30.00", main, due);
        await BillAsync(client, "Water", "expense", "60.00", main, due, cadence: "quarterly");
        await BillAsync(client, "Insurance", "expense", "120.00", main, due, cadence: "yearly");
        await BillAsync(client, "Salary", "income", "2000.00", main, due);
        await BillAsync(client, "Saving", "transfer", "500.00", main, due, toAccountId: savings);

        var totals = await TotalsAsync(client);

        Assert.Equal(("103.33", "1240.00"), (totals.MonthlyOut, totals.YearlyOut));
        Assert.Equal(("2000.00", "24000.00"), (totals.MonthlyIn, totals.YearlyIn));
        Assert.Equal((false, 0), (totals.Partial, totals.Unpriced));
        Assert.Empty(totals.PossiblyCancelled);
    }

    [Fact]
    public async Task A_variable_entry_counts_at_its_estimate_and_makes_the_totals_partial()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: client);
        await BillAsync(client, "Water", "expense", null, account, Today.AddDays(4), kind: "variable", matchKey: "VILNIAUS VANDENYS");
        await CreateTransactionAsync(client, account, null, "expense", "20.00", Iso(Today.AddDays(-60)), "VILNIAUS VANDENYS 554433");
        await CreateTransactionAsync(client, account, null, "expense", "23.00", Iso(Today.AddDays(-30)), "Vilniaus vandenys 998877");

        var totals = await TotalsAsync(client);

        Assert.Equal(("21.50", "258.00", true), (totals.MonthlyOut, totals.YearlyOut, totals.Partial));
    }

    [Fact]
    public async Task A_currency_without_a_rate_is_left_out_and_an_entry_without_an_amount_is_counted_as_unpriced()
    {
        using var client = await CreateUserClientAsync();
        var kronor = await CreateAccountAsync("1000.00", currency: "sek", client: client);
        var euros = await CreateAccountAsync("1000.00", client: client);
        await BillAsync(client, "Swedish gym", "expense", "300.00", kronor, Today.AddDays(2));
        await BillAsync(client, "Cash lessons", "expense", "40.00", null, Today.AddDays(5));
        await BillAsync(client, "New meter", "expense", null, euros, Today.AddDays(6), kind: "variable");

        var totals = await TotalsAsync(client);

        Assert.Equal(("0.00", true, 2), (totals.MonthlyOut, totals.Partial, totals.Unpriced));
    }

    [Fact]
    public async Task An_inactive_entry_is_left_out()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: client);
        var bill = await BillAsync(client, "Paused", "expense", "10.00", account, Today.AddDays(3));
        await BackdateAsync(bill, Today.AddDays(-200));
        Assert.Equal(1, await SqlAsync($"""UPDATE "RecurringBills" SET "IsActive" = FALSE WHERE "Id" = {bill}"""));

        var totals = await TotalsAsync(client);

        Assert.Equal("0.00", totals.YearlyOut);
        Assert.Empty(totals.PossiblyCancelled);
    }

    [Fact]
    public async Task An_expense_no_row_paid_for_two_cycles_is_possibly_cancelled_until_a_payment_matches()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: client);
        var due = Today.AddDays(10);
        var lapsed = await BillAsync(client, "Streaming", "expense", "9.99", account, due);
        var salary = await BillAsync(client, "Salary", "income", "2000.00", account, due);
        var fresh = await BillAsync(client, "Gym", "expense", "25.00", account, due);
        await BackdateAsync(lapsed, Today.AddDays(-200));
        await BackdateAsync(salary, Today.AddDays(-200));

        var before = await TotalsAsync(client);
        var lastMonth = RecurringBill.Retreat(due, RecurringBillCadence.Monthly, due.Day);
        await CreateTransactionAsync(client, account, null, "expense", "9.99", Iso(lastMonth.AddDays(1)), "STREAMING 4411");
        var after = await TotalsAsync(client);

        Assert.Equal(lapsed, Assert.Single(before.PossiblyCancelled));
        Assert.DoesNotContain(fresh, before.PossiblyCancelled);
        Assert.Empty(after.PossiblyCancelled);
    }

    [Fact]
    public async Task A_household_entry_counts_for_the_partner_and_the_active_household_narrows_it()
    {
        using var pair = await CreateHouseholdPairAsync();
        var shared = await CreateAccountAsync("100.00", householdId: pair.HouseholdId, client: pair.OwnerClient);
        var other = await Seed.HouseholdAsync(pair.OwnerClient);
        await BillAsync(pair.OwnerClient, "Shared rent", "expense", "400.00", shared, Today.AddDays(4), householdId: pair.HouseholdId);

        var partner = await TotalsAsync(pair.PartnerClient);
        var narrowed = await GetScopedAsync<TotalsDto>(pair.OwnerClient, Url, other);
        var household = await GetScopedAsync<TotalsDto>(pair.OwnerClient, Url, pair.HouseholdId);

        Assert.Equal("400.00", partner.MonthlyOut);
        Assert.Equal("0.00", narrowed.MonthlyOut);
        Assert.Equal("4800.00", household.YearlyOut);
    }

    [Fact]
    public async Task The_totals_are_gone_while_recurring_entries_are_off()
    {
        using var client = await CreateUserClientAsync();
        await using var off = await FeatureOffAsync("recurringBills");

        var response = await client.GetAsync(Url, TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, HttpStatusCode.NotFound, "feature.disabled");
    }

    private static string Iso(DateOnly date) => date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    private static async Task<TotalsDto> TotalsAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<TotalsDto>(Url, TestContext.Current.CancellationToken))!;

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

    private sealed record TotalsDto(
        string MonthlyOut,
        string YearlyOut,
        string MonthlyIn,
        string YearlyIn,
        bool Partial,
        int Unpriced,
        List<Guid> PossiblyCancelled);
}
