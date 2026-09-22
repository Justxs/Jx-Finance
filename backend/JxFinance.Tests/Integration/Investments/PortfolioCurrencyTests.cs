using System.Net.Http.Json;
using JxFinance.Tests.Support;
using Npgsql;

namespace JxFinance.Tests.Integration.Investments;

[Collection<IntegrationCollection>]
public sealed class PortfolioCurrencyTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const decimal UsdPerEuroInMarch2019 = 1.25m;

    [Fact]
    public async Task Cost_basis_is_what_was_paid_at_the_rate_of_each_purchase()
    {
        await StoreUsdRateAsync(new DateOnly(2019, 3, 1), new DateOnly(2019, 3, 5), UsdPerEuroInMarch2019);
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("5000.00", "investment", client: member);
        var stock = await CreateDollarStockAsync(member);
        await RecordInvestmentAsync(member, new { accountId = account, securityId = stock, type = "buy", date = "2019-03-05", quantity = "10", price = "125" });
        await SetPriceAsync(member, stock, "125");

        var portfolio = await PortfolioAsync(member, account);

        Assert.Equal("1000.00", portfolio.CostBasis);
        Assert.Equal("1136.36", portfolio.MarketValue);
        Assert.Equal("136.36", portfolio.UnrealizedGain);
        Assert.True(portfolio.IsComplete);
    }

    [Fact]
    public async Task Holding_dividends_are_added_up_in_the_security_currency()
    {
        using var member = await CreateUserClientAsync();
        var account = await CreateAccountAsync("5000.00", "investment", client: member);
        var stock = await CreateDollarStockAsync(member);
        await RecordInvestmentAsync(member, new { accountId = account, securityId = stock, type = "buy", date = "2026-06-01", quantity = "1", price = "100" });
        await RecordInvestmentAsync(member, new { accountId = account, securityId = stock, type = "dividend", date = "2026-06-02", amount = "11.00" });
        await RecordInvestmentAsync(member, new { accountId = account, securityId = stock, type = "dividend", date = "2026-06-03", amount = "10.00", currency = "eur" });
        await SetPriceAsync(member, stock, "100");

        var portfolio = await PortfolioAsync(member, account);

        Assert.Equal("22.00", Assert.Single(portfolio.Holdings).Dividends);
        Assert.Equal("20.00", portfolio.Dividends);
    }

    private async Task StoreUsdRateAsync(DateOnly from, DateOnly to, decimal rate)
    {
        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();
        for (var date = from; date <= to; date = date.AddDays(1))
        {
            await using var command = new NpgsqlCommand(
                "INSERT INTO \"ExchangeRates\" (\"Date\", \"Currency\", \"Rate\") VALUES ($1, 'USD', $2) "
                + "ON CONFLICT (\"Date\", \"Currency\") DO UPDATE SET \"Rate\" = EXCLUDED.\"Rate\"",
                connection);
            command.Parameters.AddWithValue(date);
            command.Parameters.AddWithValue(rate);
            await command.ExecuteNonQueryAsync();
        }
    }

    private static async Task<Guid> CreateDollarStockAsync(HttpClient client) =>
        (await PostAsync<IdDto>(
            client,
            "/api/investments/securities",
            new { symbol = NewSymbol(), name = "Dollar stock", type = "stock", currency = "usd" })).Id;

    private async Task SetPriceAsync(HttpClient client, Guid id, string lastPrice)
    {
        var response = await client.PutAsJsonAsync(
            $"/api/investments/securities/{id}/price",
            new { lastPrice, lastPriceDate = Today.ToString("yyyy-MM-dd") });
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
    }

    private static async Task<PortfolioDto> PortfolioAsync(HttpClient client, Guid accountId) =>
        (await client.GetFromJsonAsync<PortfolioDto>($"/api/investments/portfolio?accountId={accountId}"))!;

    private sealed record HoldingDto(string CostBasis, string Dividends);

    private sealed record PortfolioDto(
        string MarketValue,
        string CostBasis,
        string UnrealizedGain,
        string Dividends,
        bool IsComplete,
        List<HoldingDto> Holdings);
}
