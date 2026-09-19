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
            new { accountId = account, rows = new[] { Row("invalid", amount) } });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("100.00", await CurrentBalanceAsync(account));
    }

    [Fact]
    public async Task Deleted_import_stays_deduplicated()
    {
        var account = await CreateAccountAsync("100.00");
        await ConfirmAsync(account, Row("deleted"));
        var imported = await Client.GetFromJsonAsync<PageDto>($"/api/transactions?accountId={account}");
        (await Client.DeleteAsync($"/api/transactions/{imported!.Items.Single().Id}")).EnsureSuccessStatusCode();

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
        var transfers = await Client.GetFromJsonAsync<TransferPageDto>("/api/transfers?pageSize=200");
        var transfer = transfers!.Items.Single(t => t.FromAccountId == source);
        await ConfirmAsync(destination, Row("incoming", type: "income", transferAccountId: source, existingTransferId: transfer.Id));

        Assert.Equal("90.00", await CurrentBalanceAsync(source));
        Assert.Equal("110.00", await CurrentBalanceAsync(destination));
        var transactions = await Client.GetFromJsonAsync<PageDto>($"/api/transactions?accountId={source}");
        Assert.Equal(0, transactions!.Total);
    }

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
        Guid? existingTransferId = null) =>
        new { importRef, amount, type, date = date ?? new DateOnly(2026, 9, 1), description, transferAccountId, existingTransferId };

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

    private sealed record PageDto(List<IdDto> Items, int Total);

    private sealed record TransferDto(Guid Id, Guid FromAccountId);

    private sealed record TransferPageDto(List<TransferDto> Items);
}
