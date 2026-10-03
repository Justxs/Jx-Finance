using System.Net;
using System.Net.Http.Json;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Accounts;

[Collection<InvestmentsCollection>]
public sealed class CashFlowForecastTests(InvestmentsFixture fixture) : IntegrationTestBase(fixture)
{
    private const string Url = "/api/accounts/forecast";

    [Fact]
    public async Task Fixed_expenses_income_and_transfers_move_both_balances()
    {
        using var client = await CreateUserClientAsync();
        var main = await CreateAccountAsync("1000.00", client: client);
        var savings = await CreateAccountAsync("0.00", client: client);
        var tight = await CreateAccountAsync("100.00", client: client);
        await BillAsync(client, "Rent", "expense", "300.00", main, Today.AddDays(5));
        await BillAsync(client, "Salary", "income", "2000.00", main, Today.AddDays(10));
        var saving = await BillAsync(client, "Saving", "transfer", "100.00", main, Today.AddDays(15), toAccountId: savings);
        await BillAsync(client, "Loan", "expense", "300.00", tight, Today.AddDays(5));

        var forecast = await ForecastAsync(client, 30);

        Assert.Equal(Today, forecast.From);
        Assert.Equal(Today.AddDays(30), forecast.To);
        Assert.Equal(tight, forecast.Accounts[0].AccountId);
        Assert.Equal(Today.AddDays(5), forecast.Accounts[0].BelowZeroOn);
        Assert.Equal("-200.00", forecast.Accounts[0].LowestBalance);
        var mainForecast = Of(forecast, main);
        Assert.Equal("1000.00", mainForecast.StartBalance);
        Assert.Null(mainForecast.BelowZeroOn);
        Assert.Equal(
            [(Today.AddDays(5), "-300.00", "700.00"), (Today.AddDays(10), "2000.00", "2700.00"), (Today.AddDays(15), "-100.00", "2600.00")],
            mainForecast.Entries.Select(e => (e.Date, e.Amount, e.BalanceAfter)));
        Assert.All(mainForecast.Entries, e => Assert.Equal("recurring", e.Source));
        var arrival = Assert.Single(Of(forecast, savings).Entries);
        Assert.Equal((saving, "100.00", false), (arrival.BillId!.Value, arrival.Amount, arrival.Estimated));
    }

    [Fact]
    public async Task A_credit_card_is_projected_below_zero_without_a_warning()
    {
        using var client = await CreateUserClientAsync();
        var card = await CreateAccountAsync("-200.00", type: "creditCard", client: client);
        var main = await CreateAccountAsync("50.00", client: client);
        await BillAsync(client, "Streaming", "expense", "100.00", card, Today.AddDays(5));
        await BillAsync(client, "Gym", "expense", "100.00", main, Today.AddDays(5));

        var forecast = await ForecastAsync(client, 30);

        var projected = Of(forecast, card);
        Assert.Equal(("-200.00", "-300.00", Today.AddDays(5)), (projected.StartBalance, projected.LowestBalance, projected.LowestOn));
        Assert.Null(projected.BelowZeroOn);
        Assert.Null(projected.BelowZeroWithSpendingOn);
        Assert.Equal(Today.AddDays(5), Of(forecast, main).BelowZeroOn);
    }

    [Fact]
    public async Task A_transfer_between_currencies_arrives_at_the_newest_rate_as_an_estimate()
    {
        using var client = await CreateUserClientAsync();
        var euros = await CreateAccountAsync("500.00", client: client);
        var dollars = await CreateAccountAsync("0.00", currency: "usd", client: client);
        await BillAsync(client, "To dollars", "transfer", "100.00", euros, Today.AddDays(3), toAccountId: dollars);

        var forecast = await ForecastAsync(client, 30);

        var sent = Assert.Single(Of(forecast, euros).Entries);
        var received = Assert.Single(Of(forecast, dollars).Entries);
        Assert.Equal(("-100.00", false), (sent.Amount, sent.Estimated));
        Assert.Equal(("110.00", true), (received.Amount, received.Estimated));
        Assert.Equal("usd", Of(forecast, dollars).Currency);
    }

    [Fact]
    public async Task A_variable_entry_is_estimated_from_its_confirmed_occurrences()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: client);
        var due = Today.AddMonths(-3);
        var bill = await BillAsync(client, "Electricity", "expense", null, account, due, kind: "variable");
        foreach (var amount in new[] { "40.00", "60.00", "50.00" })
        {
            await PostAsync<object>(client, $"/api/recurring-bills/{bill}/confirm", new { amount, expectedDueDate = due });
            due = due.AddMonths(1);
        }

        var forecast = await ForecastAsync(client, 30);

        var first = Of(forecast, account).Entries.First(e => e.BillId == bill);
        Assert.Equal(("-50.00", true), (first.Amount, first.Estimated));
    }

    [Fact]
    public async Task A_variable_entry_is_estimated_from_imported_rows_through_its_match_key()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: client);
        var bill = await BillAsync(client, "Water", "expense", null, account, Today.AddDays(10), kind: "variable", matchKey: "VILNIAUS VANDENYS");
        await CreateTransactionAsync(client, account, null, "expense", "20.00", Iso(Today.AddDays(-60)), "VILNIAUS VANDENYS 554433");
        await CreateTransactionAsync(client, account, null, "expense", "23.00", Iso(Today.AddDays(-30)), "Vilniaus vandenys 998877");

        var forecast = await ForecastAsync(client, 30);

        var entry = Assert.Single(Of(forecast, account).Entries, e => e.BillId == bill);
        Assert.Equal(("-21.50", true), (entry.Amount, entry.Estimated));
    }

    [Fact]
    public async Task Entries_that_cannot_be_placed_are_listed_as_not_counted_and_inactive_ones_are_ignored()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: client);
        var gym = await BillAsync(client, "Gym", "expense", null, account, Today.AddDays(4), kind: "variable");
        var cash = await BillAsync(client, "Cash", "expense", "10.00", null, Today.AddDays(4));
        var paused = await BillAsync(client, "Paused", "expense", "10.00", account, Today.AddDays(4));
        await PauseAsync(client, paused, account);

        var forecast = await ForecastAsync(client, 30);

        Assert.Equal(
            [(cash, "Cash", "noAccount"), (gym, "Gym", "noHistory")],
            forecast.NotCounted.Select(s => (s.BillId, s.Name, s.Reason)));
        Assert.DoesNotContain(forecast.Accounts, a => a.AccountId == account);
    }

    [Fact]
    public async Task An_occurrence_confirmed_early_counts_once_on_its_ledger_date()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: client);
        var due = Today.AddDays(10);
        var bill = await BillAsync(client, "Insurance", "expense", "200.00", account, due);
        await PostAsync<object>(client, $"/api/recurring-bills/{bill}/confirm", new { expectedDueDate = due });

        var forecast = await ForecastAsync(client, 60);

        (DateOnly, string, Guid?, string, string)[] expected =
            [(due, "ledger", null, "-200.00", "800.00"), (due.AddMonths(1), "recurring", bill, "-200.00", "600.00")];
        Assert.Equal("1000.00", Of(forecast, account).StartBalance);
        Assert.Equal(expected, Of(forecast, account).Entries.Select(e => (e.Date, e.Source, e.BillId, e.Amount, e.BalanceAfter)));
    }

    [Fact]
    public async Task A_multi_currency_account_projects_its_main_currency()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync("100.00", client: client);
        await RecordTransactionAsync(client, new { accountId = account, type = "income", amount = "50.00", currency = "usd", date = Today.AddDays(-1) });
        await BillAsync(client, "Phone", "expense", "30.00", account, Today.AddDays(2));

        var forecast = Of(await ForecastAsync(client, 30), account);

        Assert.True(forecast.OtherCurrencies);
        Assert.Equal("100.00", forecast.StartBalance);
        Assert.Equal("70.00", Assert.Single(forecast.Entries).BalanceAfter);
    }

    [Fact]
    public async Task Usual_spending_leaves_out_the_rows_of_recurring_entries()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync("5000.00", client: client);
        await BillAsync(client, "Rent", "expense", "1000.00", account, Today.AddDays(3));
        var from = new DateOnly(Today.Year, Today.Month, 1).AddMonths(-3);
        var rates = new List<decimal>();
        for (var month = from; month < from.AddMonths(3); month = month.AddMonths(1))
        {
            await CreateTransactionAsync(client, account, null, "expense", "310.00", Iso(month), "Groceries");
            await CreateTransactionAsync(client, account, null, "expense", "1000.00", Iso(month.AddDays(1)), "Rent");
            rates.Add(310m / DateTime.DaysInMonth(month.Year, month.Month));
        }

        var forecast = Of(await ForecastAsync(client, 30), account);

        Assert.Equal(Money.Round(Statistics.Median(rates)).ToString("0.00", System.Globalization.CultureInfo.InvariantCulture), forecast.UsualDailySpending);
    }

    [Fact]
    public async Task An_account_without_three_months_of_history_has_no_usual_spending()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync("500.00", client: client);
        await CreateTransactionAsync(client, account, null, "expense", "40.00", Iso(Today.AddDays(-20)), "Groceries");
        await BillAsync(client, "Rent", "expense", "100.00", account, Today.AddDays(3));

        var forecast = Of(await ForecastAsync(client, 30), account);

        Assert.Null(forecast.UsualDailySpending);
        Assert.Null(forecast.BelowZeroWithSpendingOn);
    }

    [Fact]
    public async Task A_partners_entries_on_a_shared_account_stay_theirs()
    {
        using var pair = await CreateHouseholdPairAsync();
        var shared = await CreateAccountAsync("100.00", householdId: pair.HouseholdId, client: pair.OwnerClient);
        var partnerBill = await BillAsync(pair.PartnerClient, "Partner gym", "expense", "25.00", shared, Today.AddDays(4));

        var owner = await ForecastAsync(pair.OwnerClient, 30);
        var partner = await ForecastAsync(pair.PartnerClient, 30);

        Assert.DoesNotContain(owner.Accounts, a => a.AccountId == shared);
        Assert.Equal(partnerBill, Assert.Single(Of(partner, shared).Entries).BillId);
    }

    [Fact]
    public async Task The_active_household_narrows_the_accounts()
    {
        using var client = await CreateUserClientAsync();
        var first = await Seed.HouseholdAsync(client);
        var second = await Seed.HouseholdAsync(client);
        var account = await CreateAccountAsync("100.00", householdId: second, client: client);
        var bill = await BillAsync(client, "Shared rent", "expense", "50.00", account, Today.AddDays(4));

        var narrowed = await GetScopedAsync<ForecastDto>(client, $"{Url}?days=30", first);
        var everything = await GetScopedAsync<ForecastDto>(client, $"{Url}?days=30", null);

        Assert.DoesNotContain(narrowed.Accounts, a => a.AccountId == account);
        Assert.Equal("accountNotVisible", Assert.Single(narrowed.NotCounted, s => s.BillId == bill).Reason);
        Assert.Contains(everything.Accounts, a => a.AccountId == account);
    }

    [Theory]
    [InlineData(29)]
    [InlineData(91)]
    public async Task A_horizon_outside_30_to_90_days_is_refused(int days)
    {
        using var client = await CreateUserClientAsync();

        var response = await client.GetAsync($"{Url}?days={days}", TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, "range.invalid");
    }

    [Fact]
    public async Task The_forecast_is_gone_while_its_switch_is_off()
    {
        using var client = await CreateUserClientAsync();
        await using var off = await FeatureOffAsync("cashFlowForecast");

        var response = await client.GetAsync(Url, TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, HttpStatusCode.NotFound, "feature.disabled");
    }

    [Fact]
    public async Task With_recurring_entries_off_only_the_rows_dated_ahead_are_projected()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: client);
        await BillAsync(client, "Rent", "expense", "300.00", account, Today.AddDays(5));
        await CreateTransactionAsync(client, account, null, "expense", "200.00", Iso(Today.AddDays(8)));
        await using var off = await FeatureOffAsync("recurringBills");

        var forecast = await ForecastAsync(client, 30);

        var entry = Assert.Single(Of(forecast, account).Entries);
        Assert.Equal((Today.AddDays(8), "ledger", "-200.00"), (entry.Date, entry.Source, entry.Amount));
        Assert.Empty(forecast.NotCounted);
    }

    [Fact]
    public async Task A_what_if_payment_moves_the_forecast_without_saving_anything()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: client);
        await BillAsync(client, "Rent", "expense", "300.00", account, Today.AddDays(10));

        var tried = (await client.GetFromJsonAsync<ForecastDto>(
            $"{Url}?days=30&whatIfAccountId={account}&whatIfAmount=-1400.00&whatIfDate={Iso(Today.AddDays(3))}",
            TestContext.Current.CancellationToken))!;
        var plain = await ForecastAsync(client, 30);
        var partial = await client.GetAsync($"{Url}?days=30&whatIfAmount=-10", TestContext.Current.CancellationToken);

        var forecast = Of(tried, account);
        Assert.Equal(Today.AddDays(3), forecast.BelowZeroOn);
        Assert.Equal("-700.00", forecast.LowestBalance);
        Assert.Equal(("whatIf", "-1400.00"), (forecast.Entries[0].Source, forecast.Entries[0].Amount));
        Assert.Null(Of(plain, account).BelowZeroOn);
        await AssertValidationErrorAsync(partial, "whatIfAmount");
    }

    private static string Iso(DateOnly date) => date.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);

    private static AccountForecastDto Of(ForecastDto forecast, Guid account) =>
        Assert.Single(forecast.Accounts, a => a.AccountId == account);

    private static async Task<ForecastDto> ForecastAsync(HttpClient client, int days) =>
        (await client.GetFromJsonAsync<ForecastDto>($"{Url}?days={days}", TestContext.Current.CancellationToken))!;

    private static async Task<Guid> BillAsync(
        HttpClient client,
        string name,
        string shape,
        string? amount,
        Guid? accountId,
        DateOnly nextDueDate,
        string kind = "fixed",
        Guid? toAccountId = null,
        string? matchKey = null) =>
        (await PostAsync<IdDto>(
            client,
            "/api/recurring-bills",
            new { name, shape, kind, amount, accountId, toAccountId, cadence = "monthly", nextDueDate, remindDaysBefore = 0, matchKey })).Id;

    private async Task PauseAsync(HttpClient client, Guid bill, Guid account)
    {
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
                nextDueDate = Today.AddDays(4),
                remindDaysBefore = 0,
                isActive = false,
            },
            TestContext.Current.CancellationToken);
        response.EnsureSuccessStatusCode();
    }

    private sealed record ForecastDto(DateOnly From, DateOnly To, List<AccountForecastDto> Accounts, List<SkippedDto> NotCounted);

    private sealed record AccountForecastDto(
        Guid AccountId,
        string AccountName,
        string Currency,
        string StartBalance,
        string? UsualDailySpending,
        string LowestBalance,
        DateOnly LowestOn,
        DateOnly? BelowZeroOn,
        DateOnly? BelowZeroWithSpendingOn,
        bool OtherCurrencies,
        List<EntryDto> Entries);

    private sealed record EntryDto(
        DateOnly Date,
        string Source,
        Guid? BillId,
        string? Name,
        string? Shape,
        string Amount,
        bool Estimated,
        bool Overdue,
        string BalanceAfter);

    private sealed record SkippedDto(Guid BillId, string Name, string Reason);
}
