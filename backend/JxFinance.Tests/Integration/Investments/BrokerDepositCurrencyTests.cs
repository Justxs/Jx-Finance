using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Investments;

[Collection<IntegrationCollection>]
public sealed class BrokerDepositCurrencyTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const string Report = """
        <FlexQueryResponse queryName="JxFinance" type="AF">
          <FlexStatements count="1">
            <FlexStatement accountId="U7654321" fromDate="20260601" toDate="20260630">
              <CashTransactions>
                <CashTransaction type="Deposits/Withdrawals" currency="EUR" amount="2000" settleDate="20260601" description="CASH RECEIPTS / ELECTRONIC FUND TRANSFERS" transactionID="3001" levelOfDetail="DETAIL" />
                <CashTransaction type="Deposits/Withdrawals" currency="EUR" amount="-500" settleDate="20260605" description="DISBURSEMENT INITIATED BY OWNER" transactionID="3002" levelOfDetail="DETAIL" />
              </CashTransactions>
            </FlexStatement>
          </FlexStatements>
        </FlexQueryResponse>
        """;

    [Fact]
    public async Task Deposits_from_a_funding_account_in_another_currency_move_its_own_currency()
    {
        using var member = await CreateUserClientAsync();
        var broker = await CreateAccountAsync("0.00", "investment", "eur", client: member);
        var bank = await CreateAccountAsync("5000.00", "checking", "usd", client: member);

        var response = await UploadFlexAsync(member, broker, Report, bank);

        Assert.True(response.StatusCode == HttpStatusCode.OK, await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
        var funding = await member.GetFromJsonAsync<AccountDto>($"/api/accounts/{bank}", TestContext.Current.CancellationToken);
        Assert.Equal(new BalanceDto("usd", "3350.00"), Assert.Single(funding!.Balances));
        var account = await member.GetFromJsonAsync<AccountDto>($"/api/accounts/{broker}", TestContext.Current.CancellationToken);
        Assert.Equal(new BalanceDto("eur", "1500.00"), Assert.Single(account!.Balances));

        var transfers = await member.GetFromJsonAsync<PageDto<TransferDto>>("/api/transfers?pageSize=100", TestContext.Current.CancellationToken);
        Assert.Equal(
            [
                new TransferDto(bank, broker, "2200.00", "usd", "2000.00", "eur"),
                new TransferDto(broker, bank, "500.00", "eur", "550.00", "usd"),
            ],
            transfers!.Items.OrderBy(t => t.FromAccountId == broker).ToList());
    }

    private sealed record TransferDto(
        Guid FromAccountId,
        Guid ToAccountId,
        string Amount,
        string Currency,
        string ReceivedAmount,
        string ReceivedCurrency);
}
