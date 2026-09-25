using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Investments;

[Collection<IntegrationCollection>]
public sealed class BrokerImportConcurrencyTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Concurrent_uploads_that_introduce_the_same_security_all_succeed_and_create_it_once()
    {
        var symbol = $"C{Guid.NewGuid():N}"[..10].ToUpperInvariant();
        var report = $"""
            <FlexQueryResponse queryName="JxFinance" type="AF">
              <FlexStatements count="1">
                <FlexStatement accountId="U7654321" fromDate="20260601" toDate="20260630">
                  <Trades>
                    <Trade assetCategory="STK" subCategory="ETF" symbol="{symbol}" description="CONCURRENT FUND" listingExchange="IBIS2" currency="EUR" tradeDate="20260602" quantity="1" tradePrice="100" proceeds="-100" ibCommission="-1" ibCommissionCurrency="EUR" buySell="BUY" tradeID="9001" levelOfDetail="EXECUTION" />
                  </Trades>
                </FlexStatement>
              </FlexStatements>
            </FlexQueryResponse>
            """;
        var accounts = new List<Guid>();
        for (var i = 0; i < 6; i++)
        {
            accounts.Add(await CreateAccountAsync("1000.00", "investment", "eur"));
        }

        var responses = await Task.WhenAll(accounts.Select(account => UploadFlexAsync(Client, account, report)));

        Assert.All(responses, response => Assert.Equal(HttpStatusCode.OK, response.StatusCode));
        var results = new List<ImportDto>();
        foreach (var response in responses)
        {
            results.Add((await response.Content.ReadFromJsonAsync<ImportDto>(TestContext.Current.CancellationToken))!);
        }

        Assert.All(results, result => Assert.Equal(1, result.Trades));
        Assert.Equal(1, results.Sum(result => result.SecuritiesCreated));
        Assert.Single((await Client.GetFromJsonAsync<List<IdDto>>($"/api/investments/securities?search={symbol}", TestContext.Current.CancellationToken))!);
        foreach (var account in accounts)
        {
            Assert.Equal("899.00", await CurrentBalanceAsync(account));
        }
    }

    private sealed record ImportDto(int Trades, int SecuritiesCreated);
}
