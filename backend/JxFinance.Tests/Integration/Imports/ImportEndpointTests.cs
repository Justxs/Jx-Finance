using System.Net;
using System.Net.Http.Json;
using System.Text;
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
            "/api/import/swedbank/confirm",
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
            "/api/import/swedbank/confirm",
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
            "/api/import/swedbank/confirm",
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
            "/api/import/swedbank/confirm",
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
                "/api/import/swedbank/confirm",
                new { accountId = account, rows = new[] { Row("pounds", currency: "gbp", transferAccountId: destination) } }, TestContext.Current.CancellationToken);

            await AssertRejectedAsync(response, "currency.disabled");
        }

        Assert.Equal("100.00", await CurrentBalanceAsync(account));
    }

    private async Task<Guid> CreateTransferAsync(Guid source, Guid destination) =>
        (await PostAsync<IdDto>(
            Client,
            "/api/transfers",
            new { fromAccountId = source, toAccountId = destination, amount = "10.00", date = "2026-09-01" })).Id;

    private async Task<(HttpResponseMessage response, PreviewDto? body)> PreviewAsync(Guid accountId, string csv)
    {
        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(Encoding.UTF8.GetBytes(csv));
        fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("text/csv");
        content.Add(fileContent, "File", "export.csv");
        content.Add(new StringContent(accountId.ToString()), "AccountId");

        var response = await Client.PostAsync("/api/import/swedbank/preview", content);
        var body = response.IsSuccessStatusCode
            ? await response.Content.ReadFromJsonAsync<PreviewDto>()
            : null;
        return (response, body);
    }

    private Task<ConfirmDto> ConfirmAsync(Guid accountId, IEnumerable<PreviewRowDto> rows) =>
        ConfirmAsync(accountId, rows.Select(r => Row(r.ImportRef, r.Amount, r.Type, r.Date, r.Description)).ToArray());

    private Task<ConfirmDto> ConfirmAsync(Guid accountId, params object[] rows) =>
        PostAsync<ConfirmDto>(Client, "/api/import/swedbank/confirm", new { accountId, rows });

    private static object Row(
        string importRef,
        string amount = "10.00",
        string type = "expense",
        DateOnly? date = null,
        string? description = null,
        Guid? transferAccountId = null,
        Guid? existingTransferId = null,
        string? currency = null) =>
        new { importRef, amount, type, date = date ?? new DateOnly(2026, 9, 1), description, transferAccountId, existingTransferId, currency };

    private sealed record PreviewRowDto(
        string ImportRef,
        DateOnly Date,
        string? Payee,
        string? Description,
        string Amount,
        string Type,
        bool IsDuplicate,
        bool LooksLikeTransfer);

    private sealed record PreviewDto(List<PreviewRowDto> Rows);

    private sealed record ConfirmDto(int Imported, int SkippedDuplicates);
}
