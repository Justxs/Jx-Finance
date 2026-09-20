using System.Globalization;

namespace JxFinance.Tests.Support;

public sealed class CorporateActionFlexReport(string marker, int contractBase)
{
    public string Forward { get; } = $"FWD{marker}";

    public string Reverse { get; } = $"REV{marker}";

    public string Fractional { get; } = $"FRC{marker}";

    public string Merged { get; } = $"MRG{marker}";

    public string Xml => $"""
        <FlexQueryResponse queryName="JxFinance" type="AF">
          <FlexStatements count="1">
            <FlexStatement accountId="U7654321" fromDate="20260601" toDate="20260630">
              <Trades>
                {Trade(Forward, 1, "20260602", 10, 100, 1)}
                {Trade(Forward, 1, "20260610", 5, 50, 2)}
                {Trade(Reverse, 2, "20260603", 100, 1, 3)}
                {Trade(Reverse, 3, "20260620", -4, 12, 4)}
                {Trade(Fractional, 4, "20260604", 10, 30, 5)}
                {Trade(Merged, 5, "20260605", 10, 20, 6)}
              </Trades>
              <CorporateActions>
                <CorporateAction accountId="U7654321" currency="EUR" assetCategory="STK" symbol="{Forward}" description="{Forward}({Isin(1)}) SPLIT 2 FOR 1 ({Forward}, FORWARD SPLIT CORP, {Isin(1)})" conid="{Conid(1)}" isin="{Isin(1)}" reportDate="20260610" dateTime="20260609;202500" amount="0" proceeds="0" value="0" quantity="10" code="" type="FS" transactionID="{Id(31)}" actionID="{Id(21)}" levelOfDetail="DETAIL" />
                <CorporateAction accountId="U7654321" currency="EUR" assetCategory="STK" symbol="{Reverse}.OLD" description="{Reverse}.OLD({Isin(2)}) SPLIT 1 FOR 10 ({Reverse}, REVERSE SPLIT CORP, {Isin(3)})" conid="{Conid(2)}" isin="{Isin(2)}" reportDate="20260615" dateTime="20260612;202500" amount="0" proceeds="0" value="0" quantity="-100" code="" type="RS" transactionID="{Id(32)}" actionID="{Id(22)}" levelOfDetail="DETAIL" />
                <CorporateAction accountId="U7654321" currency="EUR" assetCategory="STK" symbol="{Reverse}" description="{Reverse}.OLD({Isin(2)}) SPLIT 1 FOR 10 ({Reverse}, REVERSE SPLIT CORP, {Isin(3)})" conid="{Conid(3)}" isin="{Isin(3)}" reportDate="20260615" dateTime="20260612;202500" amount="0" proceeds="0" value="0" quantity="10" code="" type="RS" transactionID="{Id(33)}" actionID="{Id(22)}" levelOfDetail="DETAIL" />
                <CorporateAction accountId="U7654321" currency="EUR" assetCategory="STK" symbol="{Fractional}" description="{Fractional}({Isin(4)}) SPLIT 3 FOR 2 ({Fractional}, FRACTIONAL SPLIT CORP, {Isin(4)})" conid="{Conid(4)}" isin="{Isin(4)}" reportDate="20260616" dateTime="20260615;202500" amount="0" proceeds="0" value="0" quantity="5" code="" type="FS" transactionID="{Id(34)}" actionID="{Id(23)}" levelOfDetail="DETAIL" />
                <CorporateAction accountId="U7654321" currency="EUR" assetCategory="STK" symbol="{Merged}" description="{Merged}({Isin(5)}) MERGED(Acquisition) FOR EUR 25.00 PER SHARE ({Merged}, MERGED CORP, {Isin(5)})" conid="{Conid(5)}" isin="{Isin(5)}" reportDate="20260618" dateTime="20260617;202500" amount="-250" proceeds="250" value="-200" quantity="-10" code="" type="TC" transactionID="{Id(35)}" actionID="{Id(24)}" levelOfDetail="DETAIL" />
                <CorporateAction accountId="U7654321" currency="EUR" assetCategory="STK" symbol="{Forward}" description="{Forward}({Isin(1)}) STOCK DIVIDEND {Isin(1)} 1 FOR 100 ({Forward}, FORWARD SPLIT CORP, {Isin(1)})" conid="{Conid(1)}" isin="{Isin(1)}" reportDate="20260622" dateTime="20260619;202500" amount="0" proceeds="0" value="0" quantity="0" code="" type="SD" transactionID="{Id(36)}" actionID="{Id(25)}" levelOfDetail="DETAIL" />
                <CorporateAction accountId="U7654321" currency="EUR" assetCategory="STK" symbol="{Forward}" description="Summary" conid="{Conid(1)}" reportDate="20260610" quantity="10" type="FS" transactionID="{Id(39)}" actionID="{Id(29)}" levelOfDetail="SUMMARY" />
                <CorporateAction accountId="U7654321" currency="EUR" assetCategory="STK" symbol="{Forward}" description="No identifiers" reportDate="20260610" quantity="10" type="FS" levelOfDetail="DETAIL" />
              </CorporateActions>
              <OpenPositions>
                {Position(Forward, 1, 25, 51)}
                {Position(Reverse, 3, 6, 12)}
                {Position(Fractional, 4, 15, 21)}
              </OpenPositions>
            </FlexStatement>
          </FlexStatements>
        </FlexQueryResponse>
        """;

    public string BeforeReverseSplitXml => $"""
        <FlexQueryResponse queryName="JxFinance" type="AF">
          <FlexStatements count="1">
            <FlexStatement accountId="U7654321" fromDate="20260501" toDate="20260531">
              <Trades>
                {Trade(Reverse, 2, "20260520", 50, 2, 7)}
              </Trades>
            </FlexStatement>
          </FlexStatements>
        </FlexQueryResponse>
        """;

    public string ActionId(int number) => Id(number);

    private string Trade(string symbol, int instrument, string date, int quantity, int price, int number) =>
        $"""<Trade assetCategory="STK" subCategory="COMMON" symbol="{symbol}" description="{symbol} CORP" conid="{Conid(instrument)}" isin="{Isin(instrument)}" listingExchange="IBIS" currency="EUR" tradeDate="{date}" quantity="{quantity}" tradePrice="{price}" proceeds="{-quantity * price}" ibCommission="0" ibCommissionCurrency="EUR" buySell="{(quantity > 0 ? "BUY" : "SELL")}" tradeID="{Id(number)}" levelOfDetail="EXECUTION" />""";

    private string Position(string symbol, int instrument, int quantity, int price) =>
        $"""<OpenPosition assetCategory="STK" subCategory="COMMON" symbol="{symbol}" description="{symbol} CORP" conid="{Conid(instrument)}" isin="{Isin(instrument)}" currency="EUR" reportDate="20260630" levelOfDetail="SUMMARY" position="{quantity}" markPrice="{price}" />""";

    private string Conid(int instrument) => (contractBase + instrument).ToString(CultureInfo.InvariantCulture);

    private string Isin(int instrument) => $"XX{contractBase + instrument:0000000000}";

    private string Id(int number) => $"{contractBase}{number:00}";
}
