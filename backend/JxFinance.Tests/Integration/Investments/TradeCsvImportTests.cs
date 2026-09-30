using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Investments;

[Collection<IntegrationCollection>]
public sealed class TradeCsvImportTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const string Csv = """
        Date,Type,Symbol,Name,Security type,Quantity,Price,Amount,Fee,Currency
        2026-03-02,buy,CSVFUND,CSV test fund,etf,10,100,,1.00,EUR
        2026-06-15,sell,CSVFUND,,,4,120,,0.50,EUR
        2026-06-20,dividend,CSVFUND,,,,,3.20,,EUR
        """;

    [Fact]
    public async Task A_trade_csv_books_trades_and_cash_once_and_the_entries_are_read_only()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("5000.00", "investment", "eur", client: member);

        var first = await ImportAsync(member, account, Csv);
        var second = await ImportAsync(member, account, Csv);
        var portfolio = (await member.GetFromJsonAsync<PortfolioDto>($"/api/investments/portfolio?accountId={account}", TestContext.Current.CancellationToken))!;
        var entries = (await member.GetFromJsonAsync<PageDto<EntryDto>>($"/api/investments/transactions?accountId={account}", TestContext.Current.CancellationToken))!;

        Assert.Equal((2, 1, 1), (first.Trades, first.CashEntries, first.SecuritiesCreated));
        Assert.Equal((0, 3), (second.Trades, second.Duplicates));
        Assert.Equal("6", Assert.Single(portfolio.Holdings).Quantity);
        Assert.All(entries.Items, e => Assert.Equal("tradeCsv", e.Source));
    }

    [Fact]
    public async Task A_file_without_the_required_columns_is_refused()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("0.00", "investment", "eur", client: member);

        var response = await PostAsync(member, account, "Symbol,Quantity\nAAPL,1\n");

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, "import.invalidFile");
    }

    private static async Task<ImportDto> ImportAsync(HttpClient client, Guid account, string csv) =>
        await ReadOkAsync<ImportDto>(await PostAsync(client, account, csv));

    private static async Task<HttpResponseMessage> PostAsync(HttpClient client, Guid account, string csv)
    {
        using var content = new MultipartFormDataContent();
        var file = new ByteArrayContent(Encoding.UTF8.GetBytes(csv));
        file.Headers.ContentType = new MediaTypeHeaderValue("text/csv");
        content.Add(file, "file", "trades.csv");
        content.Add(new StringContent(account.ToString()), "accountId");
        return await client.PostAsync("/api/investments/import/trade-csv", content, TestContext.Current.CancellationToken);
    }

    private sealed record ImportDto(int Trades, int CashEntries, int Duplicates, int Skipped, int SecuritiesCreated);

    private sealed record HoldingDto(string Quantity);

    private sealed record PortfolioDto(List<HoldingDto> Holdings);

    private sealed record EntryDto(Guid Id, string Source);
}
