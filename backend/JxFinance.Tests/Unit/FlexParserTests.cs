using System.Text;
using JxFinance.Infrastructure.Brokers.InteractiveBrokers;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Unit;

public sealed class FlexParserTests
{
    [Fact]
    public async Task Report_is_read_without_order_and_summary_rows()
    {
        using var stream = new MemoryStream(Encoding.UTF8.GetBytes(SampleFlexReport.Xml));

        var statement = (await FlexParser.ParseAsync(stream, CancellationToken.None)).Value!;

        Assert.Equal(5, statement.Trades.Count);
        Assert.Equal(4, statement.CashTransactions.Count);
        Assert.Equal(2, statement.OpenPositions.Count);
        Assert.Equal(new DateOnly(2026, 6, 4), statement.Trades.Single(t => t.Id == "1003").Date);
        Assert.False(statement.Trades.Single(t => t.Id == "1002").IsBuy);
    }

    [Fact]
    public async Task Report_without_a_corporate_actions_section_has_no_actions_and_reads_position_quantities()
    {
        using var stream = new MemoryStream(Encoding.UTF8.GetBytes(SampleFlexReport.Xml));

        var statement = (await FlexParser.ParseAsync(stream, CancellationToken.None)).Value!;

        Assert.Empty(statement.CorporateActions);
        Assert.Equal([6m, 2m], statement.OpenPositions.Select(p => p.Quantity));
    }

    [Fact]
    public async Task Splits_carry_the_ratio_as_new_shares_per_old_share()
    {
        var report = new CorporateActionFlexReport("UNIT", 5000000);
        using var stream = new MemoryStream(Encoding.UTF8.GetBytes(report.Xml));

        var statement = (await FlexParser.ParseAsync(stream, CancellationToken.None)).Value!;

        var splits = statement.CorporateActions.Where(a => a.IsSplit).ToList();
        Assert.Equal(
            [
                (report.ActionId(21), "FS", report.Forward, new DateOnly(2026, 6, 10), 10m, (decimal?)2m),
                (report.ActionId(22), "RS", $"{report.Reverse}.OLD", new DateOnly(2026, 6, 15), -100m, 0.1m),
                (report.ActionId(22), "RS", report.Reverse, new DateOnly(2026, 6, 15), 10m, 0.1m),
                (report.ActionId(23), "FS", report.Fractional, new DateOnly(2026, 6, 16), 5m, 1.5m),
            ],
            splits.Select(a => (a.Id, a.Type, a.Instrument.Symbol, a.Date, a.Quantity, a.Ratio)));
        Assert.NotEqual(splits[1].Instrument.ContractId, splits[2].Instrument.ContractId);
        Assert.Contains("SPLIT 3 FOR 2", splits[3].Description);
    }

    [Fact]
    public async Task Other_corporate_actions_are_read_without_a_ratio_and_summary_rows_are_dropped()
    {
        var report = new CorporateActionFlexReport("UNIT", 5000000);
        using var stream = new MemoryStream(Encoding.UTF8.GetBytes(report.Xml));

        var statement = (await FlexParser.ParseAsync(stream, CancellationToken.None)).Value!;

        var others = statement.CorporateActions.Where(a => !a.IsSplit).ToList();
        Assert.Equal([("TC", (decimal?)null), ("SD", null)], others.Select(a => (a.Type, a.Ratio)));
        Assert.Equal(6, statement.CorporateActions.Count);
        Assert.Equal(1, statement.Unreadable);
    }

    [Theory]
    [InlineData("actionDescription=\"ACME(US0000000001) SPLIT 4 FOR 1 (ACME, ACME INC, US0000000001)\" description=\"ignored\"", "4")]
    [InlineData("description=\"ACME(US0000000001) split 1 for 3 (ACME, ACME INC, US0000000001)\"", "0.33333333")]
    [InlineData("description=\"ACME(US0000000001) SPLIT 1.5 FOR 1 (ACME, ACME INC, US0000000001)\"", "1.5")]
    [InlineData("description=\"ACME(US0000000001) SPLIT 0 FOR 1 (ACME, ACME INC, US0000000001)\"", null)]
    [InlineData("description=\"ACME(US0000000001) SUBDIVISION (ACME, ACME INC, US0000000001)\"", null)]
    public async Task The_ratio_comes_from_the_split_terms_of_the_description(string attributes, string? ratio)
    {
        var xml = $"""
            <FlexQueryResponse><FlexStatements><FlexStatement accountId="U1">
              <CorporateActions>
                <CorporateAction currency="USD" assetCategory="STK" symbol="ACME" conid="1" reportDate="2026-03-02" quantity="30" type="fs" transactionID="77" {attributes} />
              </CorporateActions>
            </FlexStatement></FlexStatements></FlexQueryResponse>
            """;
        using var stream = new MemoryStream(Encoding.UTF8.GetBytes(xml));

        var action = Assert.Single((await FlexParser.ParseAsync(stream, CancellationToken.None)).Value!.CorporateActions);

        Assert.Equal(("77", "FS", new DateOnly(2026, 3, 2)), (action.Id, action.Type, action.Date));
        Assert.Equal(ratio is null ? null : decimal.Parse(ratio, System.Globalization.CultureInfo.InvariantCulture), action.Ratio);
    }

    [Theory]
    [InlineData("actionDescription=\"asml(nl0010273215) SPINOFF 1 FOR 10 (NEWCO, NEW CO, US0000000009)\" description=\"ignored\"", "NL0010273215")]
    [InlineData("description=\"ASML(NL0010273215) SPINOFF 1 FOR 10 (NEWCO, NEW CO, US0000000009)\"", "NL0010273215")]
    [InlineData("description=\"SPINOFF FROM ASML (NEWCO, NEW CO, US0000000009)\"", null)]
    [InlineData("description=\"ASML(NOTANISIN) SPINOFF 1 FOR 10\"", null)]
    public async Task A_spin_off_names_its_parent_by_the_isin_at_the_start_of_its_description(string attributes, string? parent)
    {
        var xml = $"""
            <FlexQueryResponse><FlexStatements><FlexStatement accountId="U1">
              <CorporateActions>
                <CorporateAction currency="EUR" assetCategory="STK" symbol="NEWCO" conid="9" isin="US0000000009" reportDate="2026-03-02" quantity="3" proceeds="0" value="45" type="SO" transactionID="78" {attributes} />
              </CorporateActions>
            </FlexStatement></FlexStatements></FlexQueryResponse>
            """;
        using var stream = new MemoryStream(Encoding.UTF8.GetBytes(xml));

        var action = Assert.Single((await FlexParser.ParseAsync(stream, CancellationToken.None)).Value!.CorporateActions);

        Assert.Equal(("SO", 3m, 45m, parent), (action.Type, action.Quantity, action.Value, action.SourceIsin));
    }

    [Fact]
    public async Task A_document_type_declaration_is_refused()
    {
        const string xml = """
            <?xml version="1.0"?>
            <!DOCTYPE FlexQueryResponse [<!ENTITY secret SYSTEM "file:///c:/windows/win.ini">]>
            <FlexQueryResponse><FlexStatements><FlexStatement accountId="&secret;" /></FlexStatements></FlexQueryResponse>
            """;
        using var stream = new MemoryStream(Encoding.UTF8.GetBytes(xml));

        Assert.True((await FlexParser.ParseAsync(stream, CancellationToken.None)).IsFailure);
    }

    [Fact]
    public async Task Content_that_is_not_a_flex_report_is_rejected()
    {
        using var stream = new MemoryStream(Encoding.UTF8.GetBytes("Statement,Header,Field Name"));

        Assert.True((await FlexParser.ParseAsync(stream, CancellationToken.None)).IsFailure);
    }
}
