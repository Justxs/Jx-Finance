using System.Net;
using System.Net.Http.Json;
using System.Text;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Imports;

[Collection(IntegrationCollection.Name)]
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

        var preview = await PreviewAsync(account.Id, csv);
        Assert.Equal(HttpStatusCode.OK, preview.response.StatusCode);
        Assert.Equal(3, preview.body!.Rows.Count);
        Assert.All(preview.body.Rows, r => Assert.False(r.IsDuplicate));
        Assert.Contains(preview.body.Rows, r => r.LooksLikeTransfer);
        Assert.Contains(preview.body.Rows, r => !r.LooksLikeTransfer && r.Type == "income");
        Assert.Contains(preview.body.Rows, r => !r.LooksLikeTransfer && r.Type == "expense");

        var confirmResponse = await Client.PostAsJsonAsync(
            "/api/import/swedbank/confirm",
            new
            {
                accountId = account.Id,
                rows = preview.body.Rows.Select(r => new
                {
                    importRef = r.ImportRef,
                    date = r.Date,
                    description = r.Description,
                    amount = r.Amount,
                    type = r.Type,
                    categoryId = (Guid?)null,
                }),
            });
        confirmResponse.EnsureSuccessStatusCode();
        var confirmed = await confirmResponse.Content.ReadFromJsonAsync<ConfirmDto>();
        Assert.Equal(3, confirmed!.Imported);
        Assert.Equal(0, confirmed.SkippedDuplicates);

        var previewAgain = await PreviewAsync(account.Id, csv);
        Assert.All(previewAgain.body!.Rows, r => Assert.True(r.IsDuplicate));

        var confirmAgainResponse = await Client.PostAsJsonAsync(
            "/api/import/swedbank/confirm",
            new
            {
                accountId = account.Id,
                rows = previewAgain.body.Rows.Select(r => new
                {
                    importRef = r.ImportRef,
                    date = r.Date,
                    description = r.Description,
                    amount = r.Amount,
                    type = r.Type,
                    categoryId = (Guid?)null,
                }),
            });
        var confirmedAgain = await confirmAgainResponse.Content.ReadFromJsonAsync<ConfirmDto>();
        Assert.Equal(0, confirmedAgain!.Imported);
        Assert.Equal(3, confirmedAgain.SkippedDuplicates);
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

    private async Task<AccountDto> CreateAccountAsync()
    {
        var response = await Client.PostAsJsonAsync(
            "/api/accounts",
            new { name = $"Import test {Guid.NewGuid():N}", type = "checking", startingBalance = "0.00" });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AccountDto>())!;
    }

    private sealed record AccountDto(Guid Id);

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
