using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Investments;

[Collection<IntegrationCollection>]
public sealed class CorporateActionImportTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Splits_are_booked_once_other_actions_are_reported_and_holdings_reconcile()
    {
        var report = NewReport();
        var broker = await CreateAccountAsync("10000.00", "investment", "eur");

        var first = await UploadAsync(broker, report.Xml);

        Assert.Equal((6, 3, 1, 0, 2, 4), (first.Trades, first.Splits, first.CorporateActions, first.Duplicates, first.Skipped, first.SecuritiesCreated));
        Assert.Equal([new SkippedDto("SD", 1)], first.SkippedCorporateActions);
        Assert.Empty(first.PositionMismatches!);

        var holdings = (await Client.GetFromJsonAsync<PortfolioDto>($"/api/investments/portfolio?accountId={broker}", TestContext.Current.CancellationToken))!.Holdings
            .ToDictionary(h => h.Security.Symbol, h => (h.Quantity, h.CostBasis));
        Assert.Equal(("25", "1250.00"), holdings[report.Forward]);
        Assert.Equal(("6", "60.00"), holdings[report.Reverse]);
        Assert.Equal(("15", "300.00"), holdings[report.Fractional]);
        Assert.Equal(("0", "0.00"), holdings[report.Merged]);

        var splits = (await Client.GetFromJsonAsync<PageDto<EntryDto>>($"/api/investments/transactions?accountId={broker}&type=split&pageSize=50", TestContext.Current.CancellationToken))!.Items;
        Assert.Equal(
            [(report.Forward, "2", new DateOnly(2026, 6, 10)), (report.Reverse, "0.1", new DateOnly(2026, 6, 15)), (report.Fractional, "1.5", new DateOnly(2026, 6, 16))],
            splits.OrderBy(s => s.Date).Select(s => (s.Symbol, s.Quantity, s.Date)));
        Assert.All(splits, s => Assert.Equal(("interactiveBrokers", "0.00"), (s.Source, s.CashAmount)));
        Assert.Equal("8448.00", await CurrentBalanceAsync(broker));

        var second = await UploadAsync(broker, report.Xml);

        Assert.Equal((0, 0, 0, 10, 2), (second.Trades, second.Splits, second.CorporateActions, second.Duplicates, second.Skipped));
        Assert.Empty(second.PositionMismatches!);
    }

    [Fact]
    public async Task A_deleted_split_stays_deleted_and_the_difference_is_reported()
    {
        var report = NewReport();
        var broker = await CreateAccountAsync("10000.00", "investment", "eur");
        await UploadAsync(broker, report.Xml);
        var splits = (await Client.GetFromJsonAsync<PageDto<EntryDto>>($"/api/investments/transactions?accountId={broker}&type=split&pageSize=50", TestContext.Current.CancellationToken))!.Items;
        var fractional = splits.Single(s => s.Symbol == report.Fractional);

        Assert.Equal(HttpStatusCode.NoContent, (await Client.DeleteAsync($"/api/investments/transactions/{fractional.Id}", TestContext.Current.CancellationToken)).StatusCode);
        var again = await UploadAsync(broker, report.Xml);

        Assert.Equal((0, 10), (again.Splits, again.Duplicates));
        Assert.Equal([new MismatchDto(report.Fractional, "15", "10")], again.PositionMismatches);
    }

    [Fact]
    public async Task An_imported_split_is_read_only()
    {
        var report = NewReport();
        var broker = await CreateAccountAsync("10000.00", "investment", "eur");
        await UploadAsync(broker, report.Xml);
        var split = (await Client.GetFromJsonAsync<PageDto<EntryDto>>($"/api/investments/transactions?accountId={broker}&type=split&pageSize=50", TestContext.Current.CancellationToken))!.Items[0];

        var response = await Client.PutAsJsonAsync(
            $"/api/investments/transactions/{split.Id}",
            new { accountId = broker, securityId = split.SecurityId, type = "split", date = "2026-06-10", quantity = "3" }, TestContext.Current.CancellationToken);

        await AssertRejectedAsync(response, "resource.readOnly");
    }

    [Fact]
    public async Task A_report_without_open_positions_reports_no_comparison()
    {
        var broker = await CreateAccountAsync("10000.00", "investment", "eur");
        var xml = NewReport().Xml;
        var start = xml.IndexOf("<OpenPositions>", StringComparison.Ordinal);
        var end = xml.IndexOf("</OpenPositions>", StringComparison.Ordinal) + "</OpenPositions>".Length;

        var result = await UploadAsync(broker, xml.Remove(start, end - start));

        Assert.Equal(3, result.Splits);
        Assert.Null(result.PositionMismatches);
    }

    [Fact]
    public async Task An_older_report_reuses_the_security_a_corporate_action_re_pointed()
    {
        var report = NewReport();
        var broker = await CreateAccountAsync("10000.00", "investment", "eur");
        await UploadAsync(broker, report.Xml);

        var older = await UploadAsync(broker, report.BeforeReverseSplitXml);

        Assert.Equal((1, 0, 0), (older.Trades, older.Duplicates, older.SecuritiesCreated));
        var holdings = (await Client.GetFromJsonAsync<PortfolioDto>($"/api/investments/portfolio?accountId={broker}", TestContext.Current.CancellationToken))!.Holdings
            .ToDictionary(h => h.Security.Symbol, h => (h.Quantity, h.CostBasis));
        Assert.Equal(("11", "120.00"), holdings[report.Reverse]);

        var again = await UploadAsync(broker, report.Xml);

        Assert.Equal((0, 0, 10, 0), (again.Trades, again.Splits, again.Duplicates, again.SecuritiesCreated));
    }

    [Fact]
    public async Task The_sample_report_reconciles_without_corporate_actions()
    {
        var broker = await CreateAccountAsync("0.00", "investment", "eur");

        var result = await UploadAsync(broker, SampleFlexReport.Xml);

        Assert.Equal(0, result.Splits);
        Assert.Empty(result.SkippedCorporateActions);
        Assert.Empty(result.PositionMismatches!);
    }

    [Fact]
    public async Task An_issue_change_a_spin_off_and_a_mixed_merger_are_booked_once_and_only_their_cost_share_can_be_corrected()
    {
        var marker = Guid.NewGuid().ToString("N")[..6].ToUpperInvariant();
        var contracts = RandomNumberGenerator.GetInt32(1_000_000, 9_000_000) * 10;
        var xml = ActionsXml(marker, contracts, trades: false);
        var broker = await CreateAccountAsync("10000.00", "investment", "eur");
        await UploadAsync(broker, ActionsXml(marker, contracts, trades: true));

        var first = await UploadAsync(broker, xml);
        var again = await UploadAsync(broker, xml);
        var holdings = await HoldingsAsync(broker);
        var entries = (await Client.GetFromJsonAsync<PageDto<ActionEntryDto>>($"/api/investments/transactions?accountId={broker}&pageSize=50", TestContext.Current.CancellationToken))!.Items;

        Assert.Equal(3, first.CorporateActions);
        Assert.Equal([new SkippedDto("SO", 1)], first.SkippedCorporateActions);
        Assert.Equal([$"CHD{marker}"], first.CostSharesMissing);
        Assert.Equal((0, 3), (again.CorporateActions, again.Duplicates));
        Assert.DoesNotContain($"OLD{marker}", holdings.Keys);
        Assert.Equal(("10", "1000.00"), holdings[$"NEW{marker}"]);
        Assert.Equal(("10", "500.00"), holdings[$"PAR{marker}"]);
        Assert.Equal(("5", "0.00"), holdings[$"CHD{marker}"]);
        Assert.Equal(("4", "150.00"), holdings[$"ACQ{marker}"]);
        Assert.Equal("75", entries.Single(e => e.Type == "merger").CostShare);
        Assert.Equal("8400.00", await CurrentBalanceAsync(broker));

        var spinOff = entries.Single(e => e.Type == "spinOff");
        var corrected = await Client.PutAsJsonAsync(
            $"/api/investments/transactions/{spinOff.Id}",
            new { accountId = broker, type = "spinOff", date = spinOff.Date, securityId = spinOff.SecurityId, relatedSecurityId = spinOff.RelatedSecurityId, relatedQuantity = "5", costShare = "20" },
            TestContext.Current.CancellationToken);
        var change = entries.Single(e => e.Type == "symbolChange");
        var readOnly = await Client.PutAsJsonAsync(
            $"/api/investments/transactions/{change.Id}",
            new { accountId = broker, type = "symbolChange", date = change.Date, securityId = change.SecurityId, relatedSecurityId = change.RelatedSecurityId, quantity = "5" },
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, corrected.StatusCode);
        Assert.Equal(("5", "100.00"), (await HoldingsAsync(broker))[$"CHD{marker}"]);
        await AssertProblemAsync(readOnly, HttpStatusCode.BadRequest, "resource.readOnly");
    }

    private async Task<Dictionary<string, (string Quantity, string CostBasis)>> HoldingsAsync(Guid broker) =>
        (await Client.GetFromJsonAsync<PortfolioDto>($"/api/investments/portfolio?accountId={broker}", TestContext.Current.CancellationToken))!.Holdings
            .ToDictionary(h => h.Security.Symbol, h => (h.Quantity, h.CostBasis));

    private static string ActionsXml(string marker, int contracts, bool trades)
    {
        string Isin(int instrument) => $"XX{contracts + instrument:0000000000}";
        string Trade(string symbol, int instrument, string date, int quantity, int price, int number) =>
            $"""<Trade assetCategory="STK" subCategory="COMMON" symbol="{symbol}" description="{symbol} CORP" conid="{contracts + instrument}" isin="{Isin(instrument)}" listingExchange="IBIS" currency="EUR" tradeDate="{date}" quantity="{quantity}" tradePrice="{price}" proceeds="{-quantity * price}" ibCommission="0" ibCommissionCurrency="EUR" buySell="BUY" tradeID="{contracts}{number:00}" levelOfDetail="EXECUTION" />""";
        string Action(string symbol, int instrument, int quantity, string type, int action, int number, string description, int proceeds = 0, int value = 0) =>
            $"""<CorporateAction accountId="U7654321" currency="EUR" assetCategory="STK" symbol="{symbol}" description="{description}" conid="{contracts + instrument}" isin="{Isin(instrument)}" reportDate="20260610" dateTime="20260609;202500" amount="0" proceeds="{proceeds}" value="{value}" quantity="{quantity}" code="" type="{type}" transactionID="{contracts}{number:00}" actionID="{contracts}{action:00}" levelOfDetail="DETAIL" />""";

        var body = trades
            ? $"""
                <Trades>
                  {Trade($"OLD{marker}", 1, "20260602", 10, 100, 1)}
                  {Trade($"PAR{marker}", 3, "20260603", 10, 50, 2)}
                  {Trade($"TGT{marker}", 5, "20260604", 10, 20, 3)}
                </Trades>
                """
            : $"""
                <CorporateActions>
                  {Action($"OLD{marker}", 1, -10, "IC", 41, 51, $"OLD{marker}({Isin(1)}) CUSIP/ISIN CHANGE TO ({Isin(2)})")}
                  {Action($"NEW{marker}", 2, 10, "IC", 41, 52, $"OLD{marker}({Isin(1)}) CUSIP/ISIN CHANGE TO ({Isin(2)})")}
                  {Action($"CHD{marker}", 4, 5, "SO", 42, 53, $"PAR{marker}({Isin(3)}) SPINOFF 1 FOR 2 (CHD{marker}, CHILD CO, {Isin(4)})")}
                  {Action($"ORP{marker}", 6, 3, "SO", 43, 54, $"GONE{marker}(XX9999999999) SPINOFF 3 FOR 1 (ORP{marker}, ORPHAN CO, {Isin(6)})")}
                  {Action($"TGT{marker}", 5, -10, "TC", 44, 55, $"TGT{marker}({Isin(5)}) MERGED(Acquisition) WITH ACQ{marker} 2 FOR 5", proceeds: 100)}
                  {Action($"ACQ{marker}", 7, 4, "TC", 44, 56, $"TGT{marker}({Isin(5)}) MERGED(Acquisition) WITH ACQ{marker} 2 FOR 5", value: 300)}
                </CorporateActions>
                """;
        return $"""
            <FlexQueryResponse queryName="JxFinance" type="AF">
              <FlexStatements count="1">
                <FlexStatement accountId="U7654321" fromDate="20260601" toDate="20260630">
                  {body}
                </FlexStatement>
              </FlexStatements>
            </FlexQueryResponse>
            """;
    }

    private static CorporateActionFlexReport NewReport() =>
        new(Guid.NewGuid().ToString("N")[..8].ToUpperInvariant(), RandomNumberGenerator.GetInt32(1_000_000, 9_000_000) * 10);

    private async Task<ImportDto> UploadAsync(Guid accountId, string xml)
    {
        var response = await UploadFlexAsync(Client, accountId, xml);
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        return (await response.Content.ReadFromJsonAsync<ImportDto>())!;
    }

    private sealed record SkippedDto(string Type, int Count);

    private sealed record MismatchDto(string Symbol, string BrokerQuantity, string ReplayedQuantity);

    private sealed record ImportDto(
        int Trades,
        int Splits,
        int CorporateActions,
        int Duplicates,
        int Skipped,
        int SecuritiesCreated,
        List<SkippedDto> SkippedCorporateActions,
        List<MismatchDto>? PositionMismatches,
        List<string>? CostSharesMissing = null);

    private sealed record SecurityDto(Guid Id, string Symbol);

    private sealed record HoldingDto(SecurityDto Security, string Quantity, string CostBasis);

    private sealed record PortfolioDto(List<HoldingDto> Holdings);

    private sealed record EntryDto(Guid Id, Guid? SecurityId, string? Symbol, string Type, DateOnly Date, string Quantity, string CashAmount, string Source);

    private sealed record ActionEntryDto(Guid Id, string Type, DateOnly Date, Guid? SecurityId, Guid? RelatedSecurityId, string? CostShare);
}
