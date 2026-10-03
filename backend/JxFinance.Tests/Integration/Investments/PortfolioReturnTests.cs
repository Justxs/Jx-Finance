using System.Globalization;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Investments;

[Collection<InvestmentsCollection>]
public sealed class PortfolioReturnTests(InvestmentsFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task The_portfolio_answers_its_annualized_return_and_its_allocation_by_type_and_currency()
    {
        var account = await CreateAccountAsync("50000.00", "investment", "eur");
        var fund = await CreateSecurityAsync(Client, $"RET{Guid.NewGuid():N}"[..12].ToUpperInvariant());
        var bought = Today.AddDays(-365).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        await RecordInvestmentAsync(Client, new { accountId = account, securityId = fund, type = "buy", date = bought, quantity = "10", price = "100" });
        await Client.PutAsJsonAsync(
            $"/api/investments/securities/{fund}",
            new { symbol = "RETFUND", name = "Return fund", type = "etf", currency = "eur", lastPrice = "110", lastPriceDate = Today.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) },
            TestContext.Current.CancellationToken);

        var portfolio = (await Client.GetFromJsonAsync<ReturnDto>($"/api/investments/portfolio?accountId={account}", TestContext.Current.CancellationToken))!;

        Assert.Equal(0.1m, decimal.Parse(portfolio.AnnualizedReturn!, CultureInfo.InvariantCulture));
        Assert.Equal(("etf", "1100.00"), (Assert.Single(portfolio.ByType).Key, portfolio.ByType[0].MarketValue));
        Assert.Equal("eur", Assert.Single(portfolio.ByCurrency).Key);
    }

    private sealed record SliceDto(string Key, string MarketValue);

    private sealed record ReturnDto(string? AnnualizedReturn, List<SliceDto> ByType, List<SliceDto> ByCurrency);
}
