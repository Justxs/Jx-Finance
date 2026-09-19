using JxFinance.Domain.Common;
using JxFinance.Infrastructure.Brokers.InteractiveBrokers;

namespace JxFinance.Tests.Support;

public sealed class SampleFlexReport : IFlexClient
{
    public const string Token = "123456789012";
    public const string QueryId = "987654";

    public const string Xml = """
        <FlexQueryResponse queryName="JxFinance" type="AF">
          <FlexStatements count="1">
            <FlexStatement accountId="U1234567" fromDate="20260601" toDate="20260630">
              <Trades>
                <Trade assetCategory="STK" subCategory="ETF" symbol="VWCE" description="VANGUARD FTSE ALL-WORLD" conid="338105036" isin="IE00BK5BQT80" listingExchange="IBIS2" currency="EUR" tradeDate="20260602" quantity="10" tradePrice="100" proceeds="-1000" ibCommission="-1.25" ibCommissionCurrency="EUR" buySell="BUY" tradeID="1001" levelOfDetail="EXECUTION" />
                <Trade assetCategory="STK" subCategory="ETF" symbol="VWCE" description="VANGUARD FTSE ALL-WORLD" conid="338105036" isin="IE00BK5BQT80" listingExchange="IBIS2" currency="EUR" tradeDate="20260602" quantity="10" tradePrice="100" proceeds="-1000" ibCommission="-1.25" ibCommissionCurrency="EUR" buySell="BUY" tradeID="1001" levelOfDetail="ORDER" />
                <Trade assetCategory="STK" subCategory="ETF" symbol="VWCE" description="VANGUARD FTSE ALL-WORLD" conid="338105036" isin="IE00BK5BQT80" listingExchange="IBIS2" currency="EUR" tradeDate="20260610" quantity="-4" tradePrice="110" proceeds="440" ibCommission="-1.25" ibCommissionCurrency="EUR" buySell="SELL" tradeID="1002" levelOfDetail="EXECUTION" />
                <Trade assetCategory="STK" subCategory="COMMON" symbol="AAPL" description="APPLE INC" conid="265598" isin="US0378331005" listingExchange="NASDAQ" currency="USD" tradeDate="20260604;093001" quantity="2" tradePrice="220" proceeds="-440" ibCommission="-1" ibCommissionCurrency="USD" buySell="BUY" tradeID="1003" levelOfDetail="EXECUTION" />
                <Trade assetCategory="CASH" symbol="EUR.USD" description="EUR.USD" conid="12087792" currency="USD" tradeDate="20260603" quantity="-500" tradePrice="1.1" proceeds="550" ibCommission="-2" ibCommissionCurrency="EUR" buySell="SELL" tradeID="1004" levelOfDetail="EXECUTION" />
                <Trade assetCategory="OPT" symbol="AAPL 260918C00250000" description="AAPL 18SEP26 250 C" conid="700000001" currency="USD" tradeDate="20260605" quantity="1" tradePrice="3" proceeds="-300" ibCommission="-1" ibCommissionCurrency="USD" buySell="BUY" tradeID="1005" levelOfDetail="EXECUTION" />
              </Trades>
              <CashTransactions>
                <CashTransaction type="Deposits/Withdrawals" currency="EUR" amount="2000" settleDate="20260601" description="CASH RECEIPTS / ELECTRONIC FUND TRANSFERS" transactionID="2001" levelOfDetail="DETAIL" />
                <CashTransaction type="Dividends" assetCategory="STK" symbol="AAPL" description="AAPL CASH DIVIDEND USD 0.55 PER SHARE" conid="265598" isin="US0378331005" currency="USD" amount="1.10" settleDate="20260615" transactionID="2002" levelOfDetail="DETAIL" />
                <CashTransaction type="Withholding Tax" assetCategory="STK" symbol="AAPL" description="AAPL CASH DIVIDEND - US TAX" conid="265598" isin="US0378331005" currency="USD" amount="-0.22" settleDate="20260615" transactionID="2003" levelOfDetail="DETAIL" />
                <CashTransaction type="Broker Interest Received" currency="EUR" amount="0.40" settleDate="20260616" description="EUR CREDIT INT FOR MAY" transactionID="2004" levelOfDetail="DETAIL" />
                <CashTransaction type="Dividends" currency="USD" amount="1.10" settleDate="20260615" description="Summary" transactionID="2999" levelOfDetail="SUMMARY" />
              </CashTransactions>
              <OpenPositions>
                <OpenPosition assetCategory="STK" subCategory="ETF" symbol="VWCE" description="VANGUARD FTSE ALL-WORLD" conid="338105036" isin="IE00BK5BQT80" currency="EUR" reportDate="20260630" levelOfDetail="SUMMARY" position="6" markPrice="120" />
                <OpenPosition assetCategory="STK" subCategory="COMMON" symbol="AAPL" description="APPLE INC" conid="265598" isin="US0378331005" currency="USD" reportDate="20260630" levelOfDetail="SUMMARY" position="2" markPrice="231" />
              </OpenPositions>
            </FlexStatement>
          </FlexStatements>
        </FlexQueryResponse>
        """;

    public Task<Result<Stream>> DownloadAsync(string token, string queryId, CancellationToken cancellationToken) =>
        Task.FromResult(token == Token && queryId == QueryId
            ? Result<Stream>.Success(new MemoryStream(System.Text.Encoding.UTF8.GetBytes(Xml)))
            : Result<Stream>.Failure("broker.rejected", "Interactive Brokers rejected the request: Token is invalid."));
}
