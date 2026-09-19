using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Investments;

[Collection<IntegrationCollection>]
public sealed class InvestmentEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Manual_trades_move_cash_and_build_a_fifo_holding()
    {
        var account = await CreateAccountAsync("Manual broker", "5000.00");
        var security = await CreateSecurityAsync("MANUAL1");

        await RecordAsync(new { accountId = account, securityId = security, type = "buy", date = "2026-06-01", quantity = "10", price = "100", fee = "1.00" });
        await RecordAsync(new { accountId = account, securityId = security, type = "buy", date = "2026-06-02", quantity = "10", price = "120" });
        await RecordAsync(new { accountId = account, securityId = security, type = "sell", date = "2026-06-03", quantity = "15", price = "130", fee = "1.00" });
        await RecordAsync(new { accountId = account, securityId = security, type = "dividend", date = "2026-06-04", amount = "12.50" });
        await Client.PutAsJsonAsync(
            $"/api/investments/securities/{security}",
            new { symbol = "MANUAL1", name = "Manual fund", type = "etf", currency = "eur", lastPrice = "125", lastPriceDate = "2026-06-05" });

        var portfolio = await Client.GetFromJsonAsync<PortfolioDto>($"/api/investments/portfolio?accountId={account}");
        var holding = Assert.Single(portfolio!.Holdings);
        Assert.Equal("5", holding.Quantity);
        Assert.Equal("600.00", holding.CostBasis);
        Assert.Equal("625.00", holding.MarketValue);
        Assert.Equal("25.00", holding.UnrealizedGain);
        Assert.Equal("348.00", holding.RealizedGain);
        Assert.Equal("12.50", portfolio.Dividends);
        Assert.Equal("2.00", portfolio.Fees);
        Assert.True(portfolio.IsComplete);

        var reloaded = await Client.GetFromJsonAsync<AccountDto>($"/api/accounts/{account}");
        Assert.Equal("4760.50", Assert.Single(reloaded!.Balances).Amount);
        Assert.Equal("625.00", reloaded.HoldingsValue);
        Assert.Equal("5385.50", reloaded.ReportingBalance);
    }

    [Fact]
    public async Task Selling_more_than_held_is_rejected()
    {
        var account = await CreateAccountAsync("Short broker", "100.00");
        var security = await CreateSecurityAsync("SHORT1");

        var response = await Client.PostAsJsonAsync(
            "/api/investments/transactions",
            new { accountId = account, securityId = security, type = "sell", date = "2026-06-03", quantity = "1", price = "10" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Flex_report_imports_trades_cash_conversions_and_transfers_once()
    {
        var broker = await CreateAccountAsync("IBKR upload", "0.00");
        var bank = await CreateAccountAsync("Funding bank", "5000.00");

        var first = await UploadAsync(broker, bank, SampleFlexReport.Xml);
        Assert.Equal(new ImportDto(3, 3, 1, 1, 0, 1, 0, 0), first with { SecuritiesCreated = 0, PricesUpdated = 0 });

        var account = await Client.GetFromJsonAsync<AccountDto>($"/api/accounts/{broker}");
        Assert.Equal("935.90", account!.Balances.Single(b => b.Currency == "eur").Amount);
        Assert.Equal("109.88", account.Balances.Single(b => b.Currency == "usd").Amount);
        Assert.Equal("1140.00", account.HoldingsValue);
        Assert.Equal("2175.79", account.ReportingBalance);

        var funding = await Client.GetFromJsonAsync<AccountDto>($"/api/accounts/{bank}");
        Assert.Equal("3000.00", Assert.Single(funding!.Balances).Amount);

        var portfolio = await Client.GetFromJsonAsync<PortfolioDto>($"/api/investments/portfolio?accountId={broker}");
        var fund = portfolio!.Holdings.Single(h => h.Security.Symbol == "VWCE");
        Assert.Equal("etf", fund.Security.Type);
        Assert.Equal("6", fund.Quantity);
        Assert.Equal("600.75", fund.CostBasis);
        Assert.Equal("38.25", fund.RealizedGain);
        Assert.Equal("1140.00", portfolio.MarketValue);
        Assert.Equal("1.00", portfolio.Dividends);
        Assert.Equal("0.20", portfolio.WithholdingTax);

        var second = await UploadAsync(broker, bank, SampleFlexReport.Xml);
        Assert.Equal(new ImportDto(0, 0, 0, 0, 8, 1, 0, 0), second);
    }

    [Fact]
    public async Task Other_files_are_rejected()
    {
        var broker = await CreateAccountAsync("IBKR bad file", "0.00");

        var response = await PostReportAsync(broker, null, "Statement,Header,Field Name");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Connection_hides_the_token_and_syncs_on_demand()
    {
        var broker = await CreateAccountAsync("IBKR connected", "0.00");

        var saved = await Client.PutAsJsonAsync(
            $"/api/investments/connections/{broker}",
            new { queryId = SampleFlexReport.QueryId, token = SampleFlexReport.Token });
        Assert.Equal(HttpStatusCode.OK, saved.StatusCode);
        Assert.DoesNotContain(SampleFlexReport.Token, await saved.Content.ReadAsStringAsync());

        var sync = await Client.PostAsync($"/api/investments/connections/{broker}/sync", null);
        Assert.Equal(HttpStatusCode.OK, sync.StatusCode);
        var result = await sync.Content.ReadFromJsonAsync<ImportDto>();
        Assert.Equal(3, result!.Trades);
        Assert.Equal(2, result.Skipped);

        var connections = await Client.GetFromJsonAsync<List<ConnectionDto>>("/api/investments/connections");
        var connection = connections!.Single(c => c.AccountId == broker);
        Assert.NotNull(connection.LastSyncAt);
        Assert.Null(connection.LastError);
    }

    [Fact]
    public async Task Failed_sync_is_remembered_on_the_connection()
    {
        var broker = await CreateAccountAsync("IBKR wrong token", "0.00");
        await Client.PutAsJsonAsync(
            $"/api/investments/connections/{broker}",
            new { queryId = SampleFlexReport.QueryId, token = "000000" });

        var sync = await Client.PostAsync($"/api/investments/connections/{broker}/sync", null);

        Assert.Equal(HttpStatusCode.BadRequest, sync.StatusCode);
        var connections = await Client.GetFromJsonAsync<List<ConnectionDto>>("/api/investments/connections");
        Assert.Contains("Token is invalid", connections!.Single(c => c.AccountId == broker).LastError);
    }

    private async Task<Guid> CreateAccountAsync(string name, string startingBalance)
    {
        var response = await Client.PostAsJsonAsync(
            "/api/accounts",
            new { name, type = "investment", startingBalance, currency = "eur" });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<AccountDto>())!.Id;
    }

    private async Task<Guid> CreateSecurityAsync(string symbol)
    {
        var response = await Client.PostAsJsonAsync(
            "/api/investments/securities",
            new { symbol, name = "Manual fund", type = "etf", currency = "eur" });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<SecurityDto>())!.Id;
    }

    private async Task RecordAsync(object entry)
    {
        var response = await Client.PostAsJsonAsync("/api/investments/transactions", entry);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    private async Task<ImportDto> UploadAsync(Guid accountId, Guid? fundingAccountId, string xml)
    {
        var response = await PostReportAsync(accountId, fundingAccountId, xml);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<ImportDto>())!;
    }

    private Task<HttpResponseMessage> PostReportAsync(Guid accountId, Guid? fundingAccountId, string content)
    {
        var file = new ByteArrayContent(Encoding.UTF8.GetBytes(content));
        file.Headers.ContentType = new MediaTypeHeaderValue("text/xml");
        var form = new MultipartFormDataContent
        {
            { file, "file", "flex.xml" },
            { new StringContent(accountId.ToString()), "accountId" },
        };
        if (fundingAccountId is { } funding)
        {
            form.Add(new StringContent(funding.ToString()), "fundingAccountId");
        }

        return Client.PostAsync("/api/investments/import/interactive-brokers", form);
    }

    private sealed record BalanceDto(string Currency, string Amount);

    private sealed record AccountDto(Guid Id, List<BalanceDto> Balances, string ReportingBalance, string HoldingsValue);

    private sealed record SecurityDto(Guid Id, string Symbol, string Type);

    private sealed record HoldingDto(
        SecurityDto Security,
        string Quantity,
        string CostBasis,
        string? MarketValue,
        string? UnrealizedGain,
        string RealizedGain);

    private sealed record PortfolioDto(
        string MarketValue,
        string Dividends,
        string WithholdingTax,
        string Fees,
        bool IsComplete,
        List<HoldingDto> Holdings);

    private sealed record ImportDto(
        int Trades,
        int CashEntries,
        int Conversions,
        int Transfers,
        int Duplicates,
        int Skipped,
        int SecuritiesCreated,
        int PricesUpdated);

    private sealed record ConnectionDto(Guid AccountId, DateTimeOffset? LastSyncAt, string? LastError);
}
