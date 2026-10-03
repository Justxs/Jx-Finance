using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Accounts;

[Collection<InvestmentsCollection>]
public sealed class ReconciliationTests(InvestmentsFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task The_preview_ledger_balance_equals_the_import_preview_on_the_same_date()
    {
        using var client = await CreateUserClientAsync();
        var iban = $"LT{Random.Shared.NextInt64(100_000_000_000_000_000, 999_999_999_999_999_999)}";
        var account = (await PostAsync<IdDto>(
            client,
            "/api/accounts",
            new { name = $"Account {Guid.NewGuid():N}", type = "checking", startingBalance = "100.00", iban, scope = "personal" })).Id;
        await CreateTransactionAsync(client, account, null, "expense", "15.00", "2025-06-10");
        await CreateTransactionAsync(client, account, null, "income", "40.00", "2025-07-02");
        var xml = SampleCamt053.Document(SampleCamt053.Statement(SampleCamt053.Entry(SampleCamt053.Detail()), iban))
            .Replace("2026-09-30", "2025-06-30", StringComparison.Ordinal);

        var imported = await ReadOkAsync<CamtPreviewDto>(await UploadCamtAsync(client, account, xml));
        var preview = await PreviewAsync(client, account, "2025-06-30");

        Assert.Equal("85.00", imported.Statement.LedgerBalanceAtClose);
        Assert.Equal(imported.Statement.LedgerBalanceAtClose, preview.LedgerBalance);
    }

    [Fact]
    public async Task The_preview_lists_the_rows_after_the_previous_reconciliation_newest_first()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync("100.00", client: client);
        var other = await CreateAccountAsync("0.00", client: client);
        await CreateTransactionAsync(client, account, null, "expense", "10.00", "2025-05-10");
        await RecordAsync(client, account, "2025-05-31", "90.00");
        var groceries = await CreateTransactionAsync(client, account, null, "expense", "5.00", "2025-06-05", "Groceries");
        var salary = await CreateTransactionAsync(client, account, null, "income", "50.00", "2025-06-20", "Salary");
        var transfer = await PostAsync<IdDto>(
            client,
            "/api/transfers",
            new { fromAccountId = account, toAccountId = other, amount = "20.00", date = "2025-06-25", description = "Savings" });
        await CreateTransactionAsync(client, account, null, "expense", "7.00", "2025-07-01");

        var preview = await PreviewAsync(client, account, "2025-06-30");

        Assert.Equal("115.00", preview.LedgerBalance);
        Assert.Equal((new DateOnly(2025, 5, 31), "0.00"), (preview.Previous!.Date, preview.Previous.Difference));
        Assert.Equal(
            [("transferOut", transfer.Id, "-20.00"), ("transaction", salary.Id, "50.00"), ("transaction", groceries.Id, "-5.00")],
            preview.Rows.Select(r => (r.Kind, r.Id, r.Amount)));
        Assert.Equal(3, preview.RowCount);
    }

    [Fact]
    public async Task A_later_edit_dated_before_the_statement_date_changes_the_listed_difference()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync("100.00", client: client);
        var saved = await RecordAsync(client, account, "2025-06-30", "100.00");

        await CreateTransactionAsync(client, account, null, "expense", "20.00", "2025-06-10");
        await CreateTransactionAsync(client, account, null, "expense", "5.00", "2025-07-10");

        Assert.Equal(("0.00", "manual"), (saved.Difference, saved.Source));
        var listed = Assert.Single(await ListAsync(client, account));
        Assert.Equal(("80.00", "20.00"), (listed.LedgerBalance, listed.Difference));
    }

    [Fact]
    public async Task Each_listed_reconciliation_is_measured_against_its_own_date()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync("100.00", client: client);
        await CreateTransactionAsync(client, account, null, "expense", "10.00", "2025-04-15");
        await CreateTransactionAsync(client, account, null, "expense", "30.00", "2025-05-15");
        await CreateTransactionAsync(client, account, null, "income", "5.00", "2025-06-15");
        await RecordAsync(client, account, "2025-04-30", "90.00");
        await RecordAsync(client, account, "2025-05-31", "60.00");
        await RecordAsync(client, account, "2025-06-30", "70.00");

        var listed = await ListAsync(client, account);

        Assert.Equal(
            [(new DateOnly(2025, 6, 30), "65.00", "5.00"), (new DateOnly(2025, 5, 31), "60.00", "0.00"), (new DateOnly(2025, 4, 30), "90.00", "0.00")],
            listed.Select(r => (r.Date, r.LedgerBalance, r.Difference)));
    }

    [Fact]
    public async Task Saving_twice_on_a_date_replaces_the_balance()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync("100.00", client: client);

        var first = await RecordAsync(client, account, "2025-06-30", "90.00");
        var second = await RecordAsync(client, account, "2025-06-30", "-12.30");

        var listed = Assert.Single(await ListAsync(client, account));
        Assert.Equal(first.Id, second.Id);
        Assert.Equal(("-12.30", "-112.30"), (listed.Balance, listed.Difference));
    }

    [Fact]
    public async Task A_date_after_today_is_refused()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync("100.00", client: client);
        var tomorrow = Today.AddDays(1).ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);

        var saved = await client.PostAsJsonAsync(
            $"/api/accounts/{account}/reconciliations",
            new { date = tomorrow, balance = "1.00" },
            TestContext.Current.CancellationToken);
        var preview = await client.GetAsync(
            $"/api/accounts/{account}/reconciliations/preview?date={tomorrow}",
            TestContext.Current.CancellationToken);

        await AssertProblemAsync(saved, HttpStatusCode.BadRequest, "reconciliation.futureDate");
        await AssertProblemAsync(preview, HttpStatusCode.BadRequest, "reconciliation.futureDate");
    }

    [Fact]
    public async Task A_household_member_reconciles_a_shared_account_that_another_user_cannot_see()
    {
        using var pair = await CreateHouseholdPairAsync();
        using var stranger = await CreateUserClientAsync();
        var account = await CreateAccountAsync("100.00", householdId: pair.HouseholdId, client: pair.OwnerClient);

        await RecordAsync(pair.PartnerClient, account, "2025-06-30", "100.00");
        var refused = await stranger.PostAsJsonAsync(
            $"/api/accounts/{account}/reconciliations",
            new { date = "2025-06-30", balance = "1.00" },
            TestContext.Current.CancellationToken);
        var hidden = await stranger.GetAsync($"/api/accounts/{account}/reconciliations", TestContext.Current.CancellationToken);

        Assert.Equal("100.00", Assert.Single(await ListAsync(pair.OwnerClient, account)).Balance);
        await AssertProblemAsync(refused, HttpStatusCode.NotFound, "resource.notFound");
        await AssertProblemAsync(hidden, HttpStatusCode.NotFound, "resource.notFound");
    }

    [Fact]
    public async Task An_archived_account_hides_its_reconciliations_until_it_is_restored()
    {
        var user = await CreateUserAsync();
        using var client = await LoginAsync(user);
        var account = await CreateAccountAsync("100.00", client: client);
        await RecordAsync(client, account, "2025-06-30", "100.00");

        (await client.DeleteAsync($"/api/accounts/{account}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        var whileArchived = await WithDbAsync(user.Id, db => Task.FromResult(db.AccountReconciliations.Count()));
        (await client.PostAsync($"/api/accounts/{account}/restore", null, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        Assert.Equal(0, whileArchived);
        Assert.Single(await ListAsync(client, account));
    }

    [Fact]
    public async Task Deleting_answers_no_content_and_then_not_found()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync("100.00", client: client);
        var saved = await RecordAsync(client, account, "2025-06-30", "100.00");
        var url = $"/api/accounts/{account}/reconciliations/{saved.Id}";

        var first = await client.DeleteAsync(url, TestContext.Current.CancellationToken);
        var second = await client.DeleteAsync(url, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NoContent, first.StatusCode);
        await AssertProblemAsync(second, HttpStatusCode.NotFound, "resource.notFound");
        Assert.Empty(await ListAsync(client, account));
    }

    [Fact]
    public async Task Rows_in_the_account_other_currencies_are_ignored()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync("100.00", client: client);
        await RecordTransactionAsync(client, new { accountId = account, type = "income", amount = "50.00", currency = "usd", date = "2025-06-10" });
        await CreateTransactionAsync(client, account, null, "expense", "10.00", "2025-06-11");

        var preview = await PreviewAsync(client, account, "2025-06-30");

        Assert.Equal(("90.00", "eur"), (preview.LedgerBalance, preview.Currency));
        Assert.Equal("-10.00", Assert.Single(preview.Rows).Amount);
    }

    [Fact]
    public async Task Another_currency_is_previewed_and_recorded_against_its_own_ledger_without_the_starting_balance()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync("100.00", client: client);
        var paid = await RecordTransactionAsync(client, new { accountId = account, type = "income", amount = "50.00", currency = "usd", date = "2025-06-10" });
        var spent = await RecordTransactionAsync(client, new { accountId = account, type = "expense", amount = "5.00", currency = "usd", date = "2025-06-12" });
        await CreateTransactionAsync(client, account, null, "expense", "10.00", "2025-06-11");

        var preview = (await client.GetFromJsonAsync<PreviewDto>(
            $"/api/accounts/{account}/reconciliations/preview?date=2025-06-30&currency=usd",
            TestContext.Current.CancellationToken))!;
        var recorded = await RecordAsync(client, account, "2025-06-30", "47.00", "usd");

        Assert.Equal(("45.00", "usd"), (preview.LedgerBalance, preview.Currency));
        Assert.Equal([(spent.Id, "-5.00"), (paid.Id, "50.00")], preview.Rows.Select(r => (r.Id, r.Amount)));
        Assert.Equal(("usd", "47.00", "45.00", "2.00"), (recorded.Currency, recorded.Balance, recorded.LedgerBalance, recorded.Difference));
    }

    [Fact]
    public async Task Each_currency_keeps_its_own_row_on_a_date_and_is_listed_against_its_own_ledger()
    {
        using var client = await CreateUserClientAsync();
        var account = await CreateAccountAsync("100.00", client: client);
        await RecordTransactionAsync(client, new { accountId = account, type = "income", amount = "50.00", currency = "usd", date = "2025-06-10" });
        await RecordAsync(client, account, "2025-06-30", "100.00");
        await RecordAsync(client, account, "2025-06-30", "40.00", "usd");

        await RecordAsync(client, account, "2025-06-30", "50.00", "usd");
        var listed = await ListAsync(client, account);

        Assert.Equal(
            [("eur", "100.00", "0.00"), ("usd", "50.00", "0.00")],
            listed.Select(r => (r.Currency, r.Balance, r.Difference)).Order());
    }

    [Fact]
    public async Task The_import_preview_compares_a_statement_in_another_currency_with_that_currency()
    {
        using var client = await CreateUserClientAsync();
        var iban = $"LT{Random.Shared.NextInt64(100_000_000_000_000_000, 999_999_999_999_999_999)}";
        var account = (await PostAsync<IdDto>(
            client,
            "/api/accounts",
            new { name = $"Account {Guid.NewGuid():N}", type = "checking", startingBalance = "100.00", iban, scope = "personal" })).Id;
        await RecordTransactionAsync(client, new { accountId = account, type = "income", amount = "30.00", currency = "usd", date = "2025-06-10" });
        var xml = SampleCamt053.Document(SampleCamt053.Statement(SampleCamt053.Entry(SampleCamt053.Detail()), iban))
            .Replace("2026-09-30", "2025-06-30", StringComparison.Ordinal)
            .Replace("Ccy=\"EUR\"", "Ccy=\"USD\"", StringComparison.Ordinal)
            .Replace("<Ccy>EUR</Ccy>", "<Ccy>USD</Ccy>", StringComparison.Ordinal);

        var imported = await ReadOkAsync<CamtPreviewDto>(await UploadCamtAsync(client, account, xml));

        Assert.Equal("30.00", imported.Statement.LedgerBalanceAtClose);
    }

    private static Task<ReconciliationDto> RecordAsync(HttpClient client, Guid account, string date, string balance, string? currency = null) =>
        PostAsync<ReconciliationDto>(client, $"/api/accounts/{account}/reconciliations", new { date, balance, currency });

    private static async Task<List<ReconciliationDto>> ListAsync(HttpClient client, Guid account) =>
        (await client.GetFromJsonAsync<List<ReconciliationDto>>(
            $"/api/accounts/{account}/reconciliations",
            TestContext.Current.CancellationToken))!;

    private static async Task<PreviewDto> PreviewAsync(HttpClient client, Guid account, string date) =>
        (await client.GetFromJsonAsync<PreviewDto>(
            $"/api/accounts/{account}/reconciliations/preview?date={date}",
            TestContext.Current.CancellationToken))!;

    private sealed record RowDto(string Kind, Guid Id, DateOnly Date, string? Description, string Amount);

    private sealed record PreviewDto(
        DateOnly Date,
        string Currency,
        string LedgerBalance,
        ReconciliationDto? Previous,
        List<RowDto> Rows,
        int RowCount);

    private sealed record StatementDto(string? LedgerBalanceAtClose);

    private sealed record CamtPreviewDto(StatementDto Statement);
}
