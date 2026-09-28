using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Imports;

[Collection<IntegrationCollection>]
public sealed class ImportEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const string SampleCsv =
        "\"Sąskaitos Nr.\",\"\",\"Data\",\"Gavėjas\",\"Paaiškinimai\",\"Suma\",\"Valiuta\",\"D/K\",\"Įrašo Nr.\"\n"
        + "\"LT476300010172306416\",\"10\",\"2026-05-01\",\"\",\"Likutis pradziai\",\"653.56\",\"EUR\",\"K\",\"\"\n"
        + "\"LT476300010172306416\",\"20\",\"2026-05-02\",\"LIDL/50191\",\"PIRKINYS LIDL\",\"15.77\",\"EUR\",\"D\",\"IMPORTREF-{0}-A\"\n"
        + "\"LT476300010172306416\",\"20\",\"2026-05-03\",\"\",\"Salary\",\"1000.00\",\"EUR\",\"K\",\"IMPORTREF-{0}-B\"\n"
        + "\"LT476300010172306416\",\"20\",\"2026-05-04\",\"\",\"Transfer between own accounts\",\"50.00\",\"EUR\",\"D\",\"IMPORTREF-{0}-C\"\n";

    [Fact]
    public async Task Preview_skips_balance_rows_and_flags_duplicates_and_transfers()
    {
        var account = await CreateAccountAsync();
        var marker = Guid.NewGuid().ToString("N")[..8];
        var csv = string.Format(SampleCsv, marker);

        var preview = await PreviewAsync(account, csv);
        Assert.Equal(HttpStatusCode.OK, preview.response.StatusCode);
        Assert.Equal(3, preview.body!.Rows.Count);
        Assert.All(preview.body.Rows, r => Assert.False(r.IsDuplicate));
        Assert.Contains(preview.body.Rows, r => r.LooksLikeTransfer);
        Assert.Contains(preview.body.Rows, r => !r.LooksLikeTransfer && r.Type == "income");
        Assert.Contains(preview.body.Rows, r => !r.LooksLikeTransfer && r.Type == "expense");

        var confirmed = await ConfirmAsync(account, preview.body.Rows);
        Assert.Equal(3, confirmed.Imported);
        Assert.Equal(0, confirmed.SkippedDuplicates);

        var previewAgain = await PreviewAsync(account, csv);
        Assert.All(previewAgain.body!.Rows, r => Assert.True(r.IsDuplicate));

        var confirmedAgain = await ConfirmAsync(account, previewAgain.body.Rows);
        Assert.Equal(0, confirmedAgain.Imported);
        Assert.Equal(3, confirmedAgain.SkippedDuplicates);
    }

    [Fact]
    public async Task A_hand_entered_transaction_is_offered_and_linked_instead_of_imported_again()
    {
        var account = await CreateAccountAsync("100.00");
        var entered = await CreateTransactionAsync(Client, account, null, "expense", "15.77", "2026-05-03", "Lidl groceries");
        await CreateTransactionAsync(Client, account, null, "expense", "15.77", "2026-05-09");
        var csv = string.Format(SampleCsv, Guid.NewGuid().ToString("N")[..8]);

        var preview = await PreviewAsync(account, csv);

        Assert.Equal(
            [entered.Id, null, null],
            preview.body!.Rows.Select(r => r.MatchedTransaction?.Id));
        Assert.Equal(new MatchedDto(entered.Id, new DateOnly(2026, 5, 3), "Lidl groceries", null), preview.body.Rows[0].MatchedTransaction);

        var confirmed = await ConfirmAsync(
            account,
            preview.body.Rows.Select(r => Row(r.ImportRef, r.Amount, r.Type, r.Date, r.Description, existingTransactionId: r.MatchedTransaction?.Id)).ToArray());

        Assert.Equal(new ConfirmDto(2, 0, 1), confirmed);
        Assert.Equal("1018.46", await CurrentBalanceAsync(account));
        var linked = await Client.GetFromJsonAsync<TransactionDto>($"/api/transactions/{entered.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(("imported", new DateOnly(2026, 5, 3), "Lidl groceries"), (linked!.Source, linked.Date, linked.Description));
        var again = await PreviewAsync(account, csv);
        Assert.All(again.body!.Rows, r => Assert.True(r.IsDuplicate && r.MatchedTransaction is null));
    }

    [Fact]
    public async Task One_hand_entered_transaction_cannot_be_linked_to_two_bank_entries()
    {
        var account = await CreateAccountAsync("100.00");
        var entered = await CreateTransactionAsync(Client, account, null, "expense", "10.00", "2026-09-01");

        var response = await Client.PostAsJsonAsync(
            "/api/import/confirm",
            new
            {
                accountId = account,
                rows = new[] { Row("link-1", existingTransactionId: entered.Id), Row("link-2", existingTransactionId: entered.Id) },
            },
            TestContext.Current.CancellationToken);

        await AssertRejectedAsync(response, "import.entryMismatch");
        Assert.Equal("90.00", await CurrentBalanceAsync(account));
        var retry = await ConfirmAsync(account, Row("link-2", existingTransactionId: entered.Id));
        Assert.Equal(new ConfirmDto(0, 0, 1), retry);
    }

    [Fact]
    public async Task A_link_to_an_entry_with_another_amount_is_refused()
    {
        var account = await CreateAccountAsync("100.00");
        var entered = await CreateTransactionAsync(Client, account, null, "expense", "10.01", "2026-09-01");

        var response = await Client.PostAsJsonAsync(
            "/api/import/confirm",
            new { accountId = account, rows = new[] { Row("other-amount", existingTransactionId: entered.Id) } },
            TestContext.Current.CancellationToken);

        await AssertRejectedAsync(response, "import.entryMismatch");
    }

    [Fact]
    public async Task Duplicate_rows_and_concurrent_retries_import_once()
    {
        var account = await CreateAccountAsync("100.00");

        var results = await Task.WhenAll(
            ConfirmAsync(account, Row("duplicate"), Row("duplicate")),
            ConfirmAsync(account, Row("duplicate"), Row("duplicate")));

        Assert.Equal(1, results.Sum(r => r.Imported));
        Assert.Equal("90.00", await CurrentBalanceAsync(account));
    }

    [Theory]
    [InlineData("-5.00")]
    [InlineData("0.00")]
    [InlineData("abc")]
    public async Task Confirm_rejects_invalid_money_without_writing(string amount)
    {
        var account = await CreateAccountAsync("100.00");

        var response = await Client.PostAsJsonAsync(
            "/api/import/confirm",
            new { accountId = account, rows = new[] { Row("invalid", amount) } }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("100.00", await CurrentBalanceAsync(account));
    }

    [Fact]
    public async Task Deleted_import_stays_deduplicated()
    {
        var account = await CreateAccountAsync("100.00");
        await ConfirmAsync(account, Row("deleted"));
        var imported = await Client.GetFromJsonAsync<PageDto<IdDto>>($"/api/transactions?accountId={account}", TestContext.Current.CancellationToken);
        (await Client.DeleteAsync($"/api/transactions/{imported!.Items.Single().Id}", TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        var retry = await ConfirmAsync(account, Row("deleted"));

        Assert.Equal(0, retry.Imported);
        Assert.Equal(1, retry.SkippedDuplicates);
    }

    [Fact]
    public async Task Both_bank_entries_of_one_transfer_match_a_single_transfer()
    {
        var source = await CreateAccountAsync("100.00");
        var destination = await CreateAccountAsync("100.00");

        await ConfirmAsync(source, Row("outgoing", transferAccountId: destination));
        var transfers = await Client.GetFromJsonAsync<PageDto<TransferDto>>("/api/transfers?pageSize=200", TestContext.Current.CancellationToken);
        var transfer = transfers!.Items.Single(t => t.FromAccountId == source);
        await ConfirmAsync(destination, Row("incoming", type: "income", transferAccountId: source, existingTransferId: transfer.Id));

        Assert.Equal("90.00", await CurrentBalanceAsync(source));
        Assert.Equal("110.00", await CurrentBalanceAsync(destination));
        var transactions = await Client.GetFromJsonAsync<PageDto<IdDto>>($"/api/transactions?accountId={source}", TestContext.Current.CancellationToken);
        Assert.Equal(0, transactions!.Total);
    }

    [Fact]
    public async Task Two_identical_bank_entries_in_one_file_cannot_match_the_same_transfer()
    {
        var source = await CreateAccountAsync("100.00");
        var destination = await CreateAccountAsync("100.00");
        var transfer = await CreateTransferAsync(source, destination);

        var response = await Client.PostAsJsonAsync(
            "/api/import/confirm",
            new
            {
                accountId = source,
                rows = new[]
                {
                    Row("same-file-1", transferAccountId: destination, existingTransferId: transfer),
                    Row("same-file-2", transferAccountId: destination, existingTransferId: transfer),
                },
            }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("import.transferAlreadyMatched", await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
        var retry = await ConfirmAsync(source, Row("same-file-1", transferAccountId: destination, existingTransferId: transfer));
        Assert.Equal(1, retry.Imported);
    }

    [Fact]
    public async Task An_identical_bank_entry_in_a_later_import_cannot_match_an_already_matched_transfer()
    {
        var source = await CreateAccountAsync("100.00");
        var destination = await CreateAccountAsync("100.00");
        var transfer = await CreateTransferAsync(source, destination);
        await ConfirmAsync(source, Row("first-import", transferAccountId: destination, existingTransferId: transfer));

        var response = await Client.PostAsJsonAsync(
            "/api/import/confirm",
            new { accountId = source, rows = new[] { Row("second-import", transferAccountId: destination, existingTransferId: transfer) } }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("import.transferAlreadyMatched", await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
        var other = await ConfirmAsync(
            destination,
            Row("other-side", type: "income", transferAccountId: source, existingTransferId: transfer));
        Assert.Equal(1, other.Imported);
        Assert.Equal("90.00", await CurrentBalanceAsync(source));
    }

    [Theory]
    [InlineData("expense")]
    [InlineData("income")]
    public async Task A_transfer_row_to_an_account_in_another_currency_is_refused(string type)
    {
        var euros = await CreateAccountAsync("100.00");
        var dollars = await CreateAccountAsync("100.00", currency: "usd");

        var response = await Client.PostAsJsonAsync(
            "/api/import/confirm",
            new { accountId = euros, rows = new[] { Row("cross-currency", type: type, transferAccountId: dollars) } }, TestContext.Current.CancellationToken);

        await AssertRejectedAsync(response, "transfer.receivedAmountRequired");
        Assert.Equal("100.00", await CurrentBalanceAsync(euros));
        Assert.Equal("100.00", await CurrentBalanceAsync(dollars));
    }

    [Fact]
    public async Task A_transfer_row_keeps_the_description_trimmed()
    {
        var source = await CreateAccountAsync("100.00");
        var destination = await CreateAccountAsync("100.00");

        await ConfirmAsync(source, Row("trimmed", description: "  Savings  ", transferAccountId: destination));

        var transfers = await Client.GetFromJsonAsync<PageDto<TransferDto>>("/api/transfers?pageSize=200", TestContext.Current.CancellationToken);
        Assert.Equal("Savings", transfers!.Items.Single(t => t.FromAccountId == source).Description);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task A_row_in_a_disabled_currency_is_refused(bool asTransfer)
    {
        var account = await CreateAccountAsync("100.00");
        Guid? destination = asTransfer ? await CreateAccountAsync("0.00", currency: "gbp") : null;
        await using (await OnlyCurrenciesAsync("usd"))
        {
            var response = await Client.PostAsJsonAsync(
                "/api/import/confirm",
                new { accountId = account, rows = new[] { Row("pounds", currency: "gbp", transferAccountId: destination) } }, TestContext.Current.CancellationToken);

            await AssertRejectedAsync(response, "currency.disabled");
        }

        Assert.Equal("100.00", await CurrentBalanceAsync(account));
    }

    [Fact]
    public async Task A_camt_statement_previews_confirms_and_is_then_all_duplicates()
    {
        var (account, iban) = await CreateAccountWithIbanAsync("100.00");
        var (savings, savingsIban) = await CreateAccountWithIbanAsync("0.00");
        var tag = await CreateTagAsync();
        var entries = SampleCamt053.Entry(SampleCamt053.Detail(refs: "<AcctSvcrRef>LIDL-1</AcctSvcrRef>"))
            + SampleCamt053.Entry(
                SampleCamt053.Detail(parties: "<Dbtr><Nm>Employer UAB</Nm></Dbtr>", refs: "<AcctSvcrRef>PAY-1</AcctSvcrRef>"),
                amount: "1000.00",
                direction: "CRDT")
            + SampleCamt053.Entry(SampleCamt053.Detail(
                parties: $"<Cdtr><Nm>Me</Nm></Cdtr><CdtrAcct><Id><IBAN>{savingsIban}</IBAN></Id></CdtrAcct>",
                remittance: "<Ustrd>Monthly</Ustrd>",
                refs: "<AcctSvcrRef>SAVE-1</AcctSvcrRef>"), amount: "50.00")
            + SampleCamt053.Entry(SampleCamt053.Detail(), status: "<Sts>PDNG</Sts>");
        var xml = SampleCamt053.Document(SampleCamt053.Statement(entries, iban));

        var preview = await ReadOkAsync<CamtPreviewDto>(await UploadCamtAsync(Client, account, xml));

        Assert.Equal(["LIDL-1", "PAY-1", "SAVE-1"], preview.Rows.Select(r => r.ImportRef));
        Assert.Equal(savings, preview.Rows[2].SuggestedTransferAccountId);
        Assert.True(preview.Rows[2].LooksLikeTransfer);
        Assert.Equal(
            new StatementDto(iban, true, null, 1, 0, "1250.40", "eur", "100.00"),
            preview.Statement with { ClosingDate = null });

        var confirmed = await PostAsync<ConfirmDto>(Client, "/api/import/confirm", new
        {
            accountId = account,
            format = "camt053",
            rows = new[]
            {
                Row("LIDL-1", "15.77", tagIds: [tag]),
                Row("PAY-1", "1000.00", "income"),
                Row("SAVE-1", "50.00", transferAccountId: savings),
            },
        });
        Assert.Equal(3, confirmed.Imported);

        var again = await ReadOkAsync<CamtPreviewDto>(await UploadCamtAsync(Client, account, xml));
        Assert.All(again.Rows, r => Assert.True(r.IsDuplicate));
        Assert.Equal("1034.23", again.Statement.LedgerBalanceAtClose);
        var imported = await Client.GetFromJsonAsync<PageDto<TransactionDto>>($"/api/transactions?accountId={account}", TestContext.Current.CancellationToken);
        Assert.Equal([tag], imported!.Items.Single(t => t.Amount == "15.77").TagIds);
    }

    [Fact]
    public async Task A_camt_row_is_offered_a_hand_entered_row_but_never_an_imported_one()
    {
        var (account, iban) = await CreateAccountWithIbanAsync("100.00");
        await ConfirmAsync(account, Row("ALREADY-IN", "15.77", date: new DateOnly(2026, 9, 2)));
        var xml = SampleCamt053.Document(SampleCamt053.Statement(
            SampleCamt053.Entry(SampleCamt053.Detail(refs: "<AcctSvcrRef>LIDL-2</AcctSvcrRef>")),
            iban));

        var before = await ReadOkAsync<CamtPreviewDto>(await UploadCamtAsync(Client, account, xml));
        var entered = await CreateTransactionAsync(Client, account, null, "expense", "15.77", "2026-08-30");
        var after = await ReadOkAsync<CamtPreviewDto>(await UploadCamtAsync(Client, account, xml));

        Assert.Null(before.Rows.Single().MatchedTransaction);
        Assert.Equal(entered.Id, after.Rows.Single().MatchedTransaction?.Id);
    }

    [Fact]
    public async Task A_camt_statement_for_another_account_names_it()
    {
        var (account, _) = await CreateAccountWithIbanAsync("0.00");
        var (other, otherIban) = await CreateAccountWithIbanAsync("0.00");
        var xml = SampleCamt053.Document(SampleCamt053.Statement(SampleCamt053.Entry(SampleCamt053.Detail()), otherIban));

        var preview = await ReadOkAsync<CamtPreviewDto>(await UploadCamtAsync(Client, account, xml));

        Assert.Equal((otherIban, false, (Guid?)other), (preview.Statement.Iban, preview.Statement.IbanMatchesAccount, preview.Statement.OtherAccountId));
    }

    [Fact]
    public async Task A_csv_file_sent_as_camt_is_refused()
    {
        var account = await CreateAccountAsync();

        var response = await UploadCamtAsync(Client, account, string.Format(SampleCsv, "x"));

        await AssertRejectedAsync(response, "import.invalidFile");
    }

    private async Task<(Guid Id, string Iban)> CreateAccountWithIbanAsync(string startingBalance)
    {
        var iban = $"LT{Random.Shared.NextInt64(100_000_000_000_000_000, 999_999_999_999_999_999)}";
        var created = await PostAsync<IdDto>(
            Client,
            "/api/accounts",
            new { name = $"Account {Guid.NewGuid():N}", type = "checking", startingBalance, iban, scope = "personal" });
        return (created.Id, iban);
    }

    private async Task<Guid> CreateTransferAsync(Guid source, Guid destination) =>
        (await PostAsync<IdDto>(
            Client,
            "/api/transfers",
            new { fromAccountId = source, toAccountId = destination, amount = "10.00", date = "2026-09-01" })).Id;

    private async Task<(HttpResponseMessage response, PreviewDto? body)> PreviewAsync(Guid accountId, string csv)
    {
        var response = await UploadCsvAsync(Client, accountId, csv);
        var body = response.IsSuccessStatusCode
            ? await response.Content.ReadFromJsonAsync<PreviewDto>()
            : null;
        return (response, body);
    }

    private Task<ConfirmDto> ConfirmAsync(Guid accountId, IEnumerable<PreviewRowDto> rows) =>
        ConfirmAsync(accountId, rows.Select(r => Row(r.ImportRef, r.Amount, r.Type, r.Date, r.Description)).ToArray());

    private Task<ConfirmDto> ConfirmAsync(Guid accountId, params object[] rows) =>
        PostAsync<ConfirmDto>(Client, "/api/import/confirm", new { accountId, rows });

    private static object Row(
        string importRef,
        string amount = "10.00",
        string type = "expense",
        DateOnly? date = null,
        string? description = null,
        Guid? transferAccountId = null,
        Guid? existingTransferId = null,
        string? currency = null,
        Guid[]? tagIds = null,
        Guid? existingTransactionId = null) =>
        new { importRef, amount, type, date = date ?? new DateOnly(2026, 9, 1), description, transferAccountId, existingTransferId, currency, tagIds, existingTransactionId };

    private sealed record PreviewRowDto(
        string ImportRef,
        DateOnly Date,
        string? Payee,
        string? Description,
        string Amount,
        string Type,
        bool IsDuplicate,
        bool LooksLikeTransfer,
        MatchedDto? MatchedTransaction = null);

    private sealed record MatchedDto(Guid Id, DateOnly Date, string? Description, Guid? CategoryId);

    private sealed record PreviewDto(List<PreviewRowDto> Rows);

    private sealed record CamtRowDto(
        string ImportRef,
        bool IsDuplicate,
        bool LooksLikeTransfer,
        Guid? SuggestedTransferAccountId,
        MatchedDto? MatchedTransaction = null);

    private sealed record StatementDto(
        string? Iban,
        bool IbanMatchesAccount,
        Guid? OtherAccountId,
        int NotBooked,
        int Unreadable,
        string? ClosingBalance,
        string? ClosingCurrency,
        string? LedgerBalanceAtClose,
        DateOnly? ClosingDate = null);

    private sealed record CamtPreviewDto(List<CamtRowDto> Rows, StatementDto Statement);

    private sealed record ConfirmDto(int Imported, int SkippedDuplicates, int Linked);
}
