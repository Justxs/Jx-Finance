using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Investments;

[Collection<IntegrationCollection>]
public sealed class InvestmentCorrectionTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Correcting_a_buy_recomputes_cost_basis_and_cash()
    {
        var account = await CreateAccountAsync("5000.00", "investment", "eur");
        var security = await CreateSecurityAsync(Client, "FIX1");
        var entry = await RecordInvestmentAsync(Client, new { accountId = account, securityId = security, type = "buy", date = "2026-06-01", quantity = "10", price = "100" });

        var response = await Client.PutAsJsonAsync(
            $"/api/investments/transactions/{entry}",
            new { accountId = account, securityId = security, type = "buy", date = "2026-06-01", quantity = "8", price = "90", fee = "2.00" }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var corrected = await response.Content.ReadFromJsonAsync<EntryDto>(TestContext.Current.CancellationToken);
        Assert.Equal(entry, corrected!.Id);
        Assert.Equal("8", corrected.Quantity);

        var portfolio = await Client.GetFromJsonAsync<PortfolioDto>($"/api/investments/portfolio?accountId={account}", TestContext.Current.CancellationToken);
        var holding = Assert.Single(portfolio!.Holdings);
        Assert.Equal("8", holding.Quantity);
        Assert.Equal("722.00", holding.CostBasis);

        var reloaded = await Client.GetFromJsonAsync<AccountDto>($"/api/accounts/{account}", TestContext.Current.CancellationToken);
        Assert.Equal("4278.00", Assert.Single(reloaded!.Balances).Amount);
    }

    [Fact]
    public async Task Correction_that_leaves_a_later_sale_short_is_rejected()
    {
        var account = await CreateAccountAsync("5000.00", "investment", "eur");
        var security = await CreateSecurityAsync(Client, "FIX2");
        var buy = await RecordInvestmentAsync(Client, new { accountId = account, securityId = security, type = "buy", date = "2026-06-01", quantity = "10", price = "100" });
        await RecordInvestmentAsync(Client, new { accountId = account, securityId = security, type = "sell", date = "2026-06-02", quantity = "10", price = "110" });

        var response = await Client.PutAsJsonAsync(
            $"/api/investments/transactions/{buy}",
            new { accountId = account, securityId = security, type = "buy", date = "2026-06-01", quantity = "5", price = "100" }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Correcting_an_unknown_entry_is_not_found()
    {
        var account = await CreateAccountAsync("100.00", "investment", "eur");

        var response = await Client.PutAsJsonAsync(
            $"/api/investments/transactions/{Guid.NewGuid()}",
            new { accountId = account, type = "interest", date = "2026-06-01", amount = "1.00" }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private sealed record EntryDto(Guid Id, string Quantity);

    private sealed record HoldingDto(string Quantity, string CostBasis);

    private sealed record PortfolioDto(List<HoldingDto> Holdings);
}
