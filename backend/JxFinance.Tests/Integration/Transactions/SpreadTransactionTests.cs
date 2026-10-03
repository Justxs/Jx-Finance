using System.Net;
using System.Net.Http.Json;
using JxFinance.Infrastructure.Data;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Transactions;

[Collection<LedgerCollection>]
public sealed class SpreadTransactionTests(LedgerFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task A_spread_row_keeps_its_whole_amount_in_the_ledger_summary_the_balance_and_the_forecast()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var row = await SpreadAsync(member, account, "360.00", Today, 12);
        await PostAsync<IdDto>(
            member,
            "/api/recurring-bills",
            new { name = "Rent", shape = "expense", kind = "fixed", amount = "100.00", accountId = account, cadence = "monthly", nextDueDate = Today.AddDays(10), remindDaysBefore = 0 });
        var month = new DateOnly(Today.Year, Today.Month, 1);

        var summary = (await member.GetFromJsonAsync<SummaryDto>(
            $"/api/transactions/summary?dateFrom={month:yyyy-MM-dd}&dateTo={month.AddMonths(1).AddDays(-1):yyyy-MM-dd}",
            TestContext.Current.CancellationToken))!;
        var forecast = (await member.GetFromJsonAsync<ForecastDto>("/api/accounts/forecast?days=30", TestContext.Current.CancellationToken))!;

        Assert.Equal((12, Today.AddMonths(11)), (row.SpreadMonths, row.SpreadUntil));
        Assert.Equal((1, "360.00"), (summary.Count, summary.TotalExpense));
        Assert.Equal("640.00", await CurrentBalanceAsync(account, member));
        Assert.Equal("640.00", forecast.Accounts.Single(a => a.AccountId == account).StartBalance);
    }

    [Fact]
    public async Task The_overlap_flag_brings_a_january_row_into_a_march_range_and_nothing_else_does()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var insurance = await SpreadAsync(member, account, "360.00", new DateOnly(2026, 1, 15), 12);
        var shortOne = await SpreadAsync(member, account, "60.00", new DateOnly(2026, 1, 20), 2);
        var march = await CreateTransactionAsync(member, account, null, "expense", "9.00", "2026-03-05");
        const string range = "dateFrom=2026-03-01&dateTo=2026-03-31";

        var overlapping = await LedgerAsync(member, $"{range}&spreadOverlap=true");
        var plain = await LedgerAsync(member, range);
        var withoutRange = await LedgerAsync(member, $"accountId={account}&spreadOverlap=true");
        var summary = (await member.GetFromJsonAsync<SummaryDto>($"/api/transactions/summary?{range}&spreadOverlap=true", TestContext.Current.CancellationToken))!;

        Assert.Equal([march.Id, insurance.Id], overlapping.Items.Select(t => t.Id));
        Assert.Equal([march.Id], plain.Items.Select(t => t.Id));
        Assert.Equal(3, withoutRange.Total);
        Assert.DoesNotContain(shortOne.Id, overlapping.Items.Select(t => t.Id));
        Assert.Equal((2, "369.00"), (summary.Count, summary.TotalExpense));
    }

    [Fact]
    public async Task A_split_or_a_refund_can_be_spread_and_the_months_stay_within_range()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var food = await CreateCategoryAsync(client: member);
        var home = await CreateCategoryAsync(client: member);

        var split = await member.PostAsJsonAsync(
            "/api/transactions",
            new
            {
                accountId = account,
                type = "expense",
                amount = "50.00",
                date = "2026-03-03",
                spreadMonths = 3,
                lines = new object[] { new { categoryId = food, amount = "30.00" }, new { categoryId = home, amount = "20.00" } },
            },
            TestContext.Current.CancellationToken);
        var refund = await member.PostAsJsonAsync(
            "/api/transactions",
            new { accountId = account, categoryId = food, type = "expense", amount = "-50.00", date = "2026-03-03", spreadMonths = 3 },
            TestContext.Current.CancellationToken);
        var one = await member.PostAsJsonAsync(
            "/api/transactions",
            new { accountId = account, type = "expense", amount = "50.00", date = "2026-03-03", spreadMonths = 1 },
            TestContext.Current.CancellationToken);
        var tooMany = await member.PostAsJsonAsync(
            "/api/transactions",
            new { accountId = account, type = "expense", amount = "50.00", date = "2026-03-03", spreadMonths = 37 },
            TestContext.Current.CancellationToken);

        Assert.Equal((3, 3), ((await ReadOkAsync<SpreadRowDto>(split)).SpreadMonths, (await ReadOkAsync<SpreadRowDto>(refund)).SpreadMonths));
        await AssertProblemAsync(one, HttpStatusCode.BadRequest, "range.invalid");
        await AssertProblemAsync(tooMany, HttpStatusCode.BadRequest, "range.invalid");
    }

    [Fact]
    public async Task A_change_of_reporting_currency_revalues_the_slices()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        await SpreadAsync(member, account, "330.00", new DateOnly(2025, 1, 10), 3);

        await using (await OverrideSettingsAsync(settings => settings["reportingCurrency"] = "usd"))
        {
            var february = await ReportAsync(member, "dateFrom=2025-02-01&dateTo=2025-02-28");

            Assert.Equal("121.00", february.TotalExpense);
        }
    }

    [Fact]
    public async Task The_active_household_narrows_the_slices()
    {
        using var pair = await CreateHouseholdPairAsync();
        var other = await Seed.HouseholdAsync(pair.OwnerClient);
        var shared = await CreateAccountAsync("100.00", householdId: pair.HouseholdId, client: pair.OwnerClient);
        var elsewhere = await CreateAccountAsync("100.00", householdId: other, client: pair.OwnerClient);
        await SpreadAsync(pair.OwnerClient, shared, "120.00", new DateOnly(2026, 1, 5), 12);
        await SpreadAsync(pair.OwnerClient, elsewhere, "240.00", new DateOnly(2026, 1, 5), 12);
        const string march = "/api/reports/summary?dateFrom=2026-03-01&dateTo=2026-03-31";

        var everything = await GetScopedAsync<ReportDto>(pair.OwnerClient, march, null);
        var narrowed = await GetScopedAsync<ReportDto>(pair.OwnerClient, march, pair.HouseholdId);
        var partner = await ReportAsync(pair.PartnerClient, "dateFrom=2026-03-01&dateTo=2026-03-31");

        Assert.Equal("30.00", everything.TotalExpense);
        Assert.Equal("10.00", narrowed.TotalExpense);
        Assert.Equal("10.00", partner.TotalExpense);
    }

    [Fact]
    public async Task A_spread_row_restored_from_the_trash_brings_its_slices_back()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var row = await SpreadAsync(member, account, "120.00", new DateOnly(2026, 1, 5), 12);
        const string march = "dateFrom=2026-03-01&dateTo=2026-03-31";

        (await member.DeleteAsync($"/api/transactions/{row.Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var deleted = await ReportAsync(member, march);
        (await member.PostAsJsonAsync("/api/trash/restore", new { kind = "transaction", entityId = row.Id }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var restored = await ReportAsync(member, march);

        Assert.Equal("0.00", deleted.TotalExpense);
        Assert.Equal("10.00", restored.TotalExpense);
    }

    [Fact]
    public async Task A_spread_debt_payment_lowers_the_debt_by_its_whole_amount_on_its_date()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync(client: member);
        var debt = (await PostAsync<IdDto>(
            member,
            "/api/debts",
            new { name = "Car loan", type = "loan", outstandingAmount = "1000.00", asOf = "2026-05-01", tracksPayments = true })).Id;
        var payment = await SpreadAsync(member, account, "600.00", new DateOnly(2026, 5, 10), 12);

        var linked = await ReadOkAsync<DebtDto>(await member.PostAsJsonAsync(
            $"/api/debts/{debt}/payments",
            new { transactionId = payment.Id },
            TestContext.Current.CancellationToken));
        var payments = (await member.GetFromJsonAsync<List<DebtPaymentDto>>($"/api/debts/{debt}/payments", TestContext.Current.CancellationToken))!;

        Assert.Equal("400.00", linked.TrackedBalance);
        Assert.Equal(("600.00", "600.00"), (Assert.Single(payments).Amount, payments[0].Principal));
    }

    [Fact]
    public async Task A_spread_row_split_with_a_household_settles_in_full()
    {
        using var pair = await CreateHouseholdPairAsync();
        var account = await CreateAccountAsync(client: pair.OwnerClient);
        var row = await SpreadAsync(pair.OwnerClient, account, "90.00", new DateOnly(2026, 9, 10), 3);

        await ReadOkAsync<object>(await pair.OwnerClient.PostAsJsonAsync(
            $"/api/households/{pair.HouseholdId}/shared-expenses",
            new
            {
                transactionId = row.Id,
                method = "equal",
                shares = new[] { new { userId = pair.Owner.Id }, new { userId = pair.Partner.Id } },
            },
            TestContext.Current.CancellationToken));
        var balances = await ReadOkAsync<SettleUpDto>(await pair.PartnerClient.GetAsync(
            $"/api/households/{pair.HouseholdId}/settle-up",
            TestContext.Current.CancellationToken));

        Assert.Equal("45.00", balances.Balances.Single(b => b.UserId == pair.Owner.Id && b.Currency == "eur").Amount);
        Assert.Equal("-45.00", balances.Balances.Single(b => b.UserId == pair.Partner.Id && b.Currency == "eur").Amount);
    }

    [Fact]
    public async Task A_backward_row_paid_after_a_range_is_drilled_into_from_it_and_an_update_without_a_direction_spreads_forward()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var water = await PostAsync<SpreadRowDto>(
            member,
            "/api/transactions",
            new { accountId = account, type = "expense", amount = "90.00", date = "2026-04-10", description = "Water", spreadMonths = 3, spreadDirection = "backward" });
        const string range = "dateFrom=2026-03-01&dateTo=2026-03-31";

        var overlapping = await LedgerAsync(member, $"{range}&spreadOverlap=true");
        var forward = await ReadOkAsync<SpreadRowDto>(await member.PutAsJsonAsync(
            $"/api/transactions/{water.Id}",
            new { id = water.Id, accountId = account, type = "expense", amount = "90.00", date = "2026-04-10", description = "Water", spreadMonths = 3 },
            TestContext.Current.CancellationToken));
        var afterwards = await LedgerAsync(member, $"{range}&spreadOverlap=true");

        Assert.Equal(("backward", new DateOnly(2026, 2, 10), new DateOnly(2026, 4, 10)), (water.SpreadDirection, water.SpreadFrom, water.SpreadUntil));
        Assert.Equal([water.Id], overlapping.Items.Select(t => t.Id));
        Assert.Equal(("forward", new DateOnly(2026, 4, 10), new DateOnly(2026, 6, 10)), (forward.SpreadDirection, forward.SpreadFrom, forward.SpreadUntil));
        Assert.Empty(afterwards.Items);
    }

    [Fact]
    public async Task A_row_that_is_not_spread_has_no_direction_and_the_backfill_starts_old_spreads_on_their_date()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", client: member);
        var plain = await PostAsync<SpreadRowDto>(member, "/api/transactions", new { accountId = account, type = "expense", amount = "9.00", date = "2026-03-05" });
        var spread = await SpreadAsync(member, account, "120.00", new DateOnly(2026, 1, 15), 4);
        await SqlAsync($"""UPDATE "Transactions" SET "SpreadFrom" = NULL WHERE "Id" = {spread.Id}""");

        await WithDbAsync(db => SpreadFromBackfill.RunAsync(db, TestContext.Current.CancellationToken));
        var again = await WithDbAsync(db => SpreadFromBackfill.RunAsync(db, TestContext.Current.CancellationToken));

        Assert.Equal(((string?)null, (DateOnly?)null, (DateOnly?)null), (plain.SpreadDirection, plain.SpreadFrom, plain.SpreadUntil));
        Assert.Equal(0, again);
        var stored = (await member.GetFromJsonAsync<SpreadRowDto>($"/api/transactions/{spread.Id}", TestContext.Current.CancellationToken))!;
        Assert.Equal((new DateOnly(2026, 1, 15), new DateOnly(2026, 4, 15)), (stored.SpreadFrom, stored.SpreadUntil));
    }

    private static Task<SpreadRowDto> SpreadAsync(HttpClient client, Guid accountId, string amount, DateOnly date, int spreadMonths) =>
        PostAsync<SpreadRowDto>(
            client,
            "/api/transactions",
            new { accountId, type = "expense", amount, date, description = "Insurance", spreadMonths });

    private static async Task<PageDto<SpreadRowDto>> LedgerAsync(HttpClient client, string query) =>
        (await client.GetFromJsonAsync<PageDto<SpreadRowDto>>($"/api/transactions?{query}&sort=date&direction=desc", TestContext.Current.CancellationToken))!;

    private static async Task<ReportDto> ReportAsync(HttpClient client, string query) =>
        (await client.GetFromJsonAsync<ReportDto>($"/api/reports/summary?{query}", TestContext.Current.CancellationToken))!;

    private sealed record SpreadRowDto(Guid Id, DateOnly Date, int? SpreadMonths, DateOnly? SpreadUntil, string? SpreadDirection = null, DateOnly? SpreadFrom = null);

    private sealed record SummaryDto(int Count, string TotalIncome, string TotalExpense);

    private sealed record ReportDto(string TotalExpense);

    private sealed record AccountForecastDto(Guid AccountId, string StartBalance);

    private sealed record ForecastDto(List<AccountForecastDto> Accounts);

    private sealed record DebtDto(Guid Id, string? TrackedBalance);

    private sealed record DebtPaymentDto(Guid TransactionId, string Amount, string Principal);

    private sealed record BalanceLineDto(Guid UserId, string Currency, string Amount);

    private sealed record SettleUpDto(List<BalanceLineDto> Balances);
}
