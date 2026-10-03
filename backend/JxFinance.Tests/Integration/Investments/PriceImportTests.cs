using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Investments;

[Collection<InvestmentsCollection>]
public sealed class PriceImportTests(InvestmentsFixture fixture) : IntegrationTestBase(fixture)
{
    private const string File = """
        date;price
        2026-06-01;101,50
        2026-06-02;102.25
        not a date;103
        """;

    [Fact]
    public async Task A_holder_imports_prices_with_the_switch_off_and_no_outside_request()
    {
        (await Client.PutAsJsonAsync("/api/settings/market-prices", new { enabled = false }, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        using var holder = await CreateUserClientAsync();
        var account = await CreateAccountAsync("1000.00", "investment", client: holder);
        var security = await CreateSecurityAsync(holder);
        await RecordInvestmentAsync(holder, new { accountId = account, securityId = security, type = "buy", date = "2026-05-29", quantity = "1", price = "100" });

        var result = await ReadOkAsync<ImportDto>(await ImportAsync(holder, security, File));
        var again = await ReadOkAsync<ImportDto>(await ImportAsync(holder, security, File));
        var prices = await holder.GetFromJsonAsync<List<PriceDto>>($"/api/investments/securities/{security}/prices", TestContext.Current.CancellationToken);

        Assert.Equal(new ImportDto(2, 0, 1), result);
        Assert.Equal(new ImportDto(0, 2, 1), again);
        Assert.Equal(
            [new PriceDto(new DateOnly(2026, 6, 2), "102.25", "file"), new PriceDto(new DateOnly(2026, 6, 1), "101.5", "file")],
            prices);
    }

    [Fact]
    public async Task Someone_who_does_not_hold_the_security_is_refused()
    {
        using var stranger = await CreateUserClientAsync();
        var security = await CreateSecurityAsync(Client);

        var response = await ImportAsync(stranger, security, File);

        await AssertProblemAsync(response, HttpStatusCode.Forbidden, "security.notHeld");
    }

    [Fact]
    public async Task A_file_without_a_price_column_is_refused()
    {
        var security = await CreateSecurityAsync(Client);

        var response = await ImportAsync(Client, security, "date;close\n2026-06-01;12\n");

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, "import.missingColumns");
    }

    private static async Task<HttpResponseMessage> ImportAsync(HttpClient client, Guid security, string csv)
    {
        var file = new ByteArrayContent(Encoding.UTF8.GetBytes(csv));
        file.Headers.ContentType = new MediaTypeHeaderValue("text/csv");
        using var form = new MultipartFormDataContent { { file, "file", "prices.csv" } };
        return await client.PostAsync($"/api/investments/securities/{security}/prices/import", form, TestContext.Current.CancellationToken);
    }

    private sealed record ImportDto(int Written, int Skipped, int Unreadable);

    private sealed record PriceDto(DateOnly Date, string Price, string Source);
}
