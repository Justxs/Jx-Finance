using JxFinance.Common.Errors;
using JxFinance.Domain.Imports;
using JxFinance.Endpoints.Imports.InspectCsv;
using JxFinance.Endpoints.Imports.Parsing;
using static JxFinance.Tests.Support.SampleCsv;

namespace JxFinance.Tests.Unit;

public sealed class CsvInspectorTests
{
    [Fact]
    public async Task A_revolut_export_is_proposed_as_utf8_comma_with_the_header_first()
    {
        var inspection = await InspectAsync(Utf8(Revolut));

        Assert.Equal((CsvEncoding.Utf8, ",", 0), (inspection.Encoding, inspection.Delimiter, inspection.SkipLines));
        Assert.Equal("Completed Date", inspection.Columns[3].Name);
        Assert.Equal(["yyyy-MM-dd"], Column(inspection, "Completed Date").DateFormats);
        Assert.Empty(Column(inspection, "Description").DateFormats);
        Assert.Equal(CsvDecimalSeparator.Dot, Column(inspection, "Amount").DecimalSeparator);
        Assert.Null(Column(inspection, "Description").DecimalSeparator);
        Assert.Equal(6, inspection.Samples.Count);
        Assert.Empty(inspection.MatchingMappingIds);
    }

    [Fact]
    public async Task A_card_statement_is_proposed_as_semicolon_with_three_lines_above_the_header_and_a_decimal_comma()
    {
        var inspection = await InspectAsync(Utf8(CardStatement));

        Assert.Equal((";", 3), (inspection.Delimiter, inspection.SkipLines));
        Assert.Equal(["Date", "Merchant", "Amount", "Balance"], inspection.Columns.Select(c => c.Name));
        Assert.Equal(CsvDecimalSeparator.Comma, Column(inspection, "Amount").DecimalSeparator);
        Assert.Equal(["yyyy-MM-dd"], Column(inspection, "Date").DateFormats.Take(1));
    }

    [Fact]
    public async Task Bytes_that_are_not_utf8_are_proposed_as_windows_1257()
    {
        var inspection = await InspectAsync(Windows1257(Lithuanian));

        Assert.Equal(CsvEncoding.Windows1257, inspection.Encoding);
        Assert.Equal(["Data", "Paaiškinimas", "Gavėjas", "Debetas", "Kreditas"], inspection.Columns.Select(c => c.Name));
        Assert.Equal(["dd.MM.yyyy", "d.M.yyyy"], Column(inspection, "Data").DateFormats);
        Assert.Equal(CsvDecimalSeparator.Comma, Column(inspection, "Debetas").DecimalSeparator);
    }

    [Fact]
    public async Task Day_and_month_that_cannot_be_told_apart_leave_both_formats()
    {
        var ambiguous = await InspectAsync(Utf8("Date,Amount\n03/04/2026,1.00\n05/06/2026,2.00\n"));
        var settled = await InspectAsync(Utf8("Date,Amount\n03/04/2026,1.00\n13/06/2026,2.00\n"));

        Assert.Equal(["dd/MM/yyyy", "MM/dd/yyyy"], Column(ambiguous, "Date").DateFormats);
        Assert.Equal(["dd/MM/yyyy"], Column(settled, "Date").DateFormats);
    }

    [Fact]
    public async Task A_tab_delimited_file_is_detected_and_a_correction_is_honoured()
    {
        const string csv = "Date\tText\tAmount\n2026-09-01\tShop, Vilnius\t-4.20\n2026-09-02\tPay\t10.00\n";

        var detected = await InspectAsync(Utf8(csv));
        var corrected = await CsvInspector.InspectAsync(new MemoryStream(Utf8(csv)), CsvEncoding.Windows1252, "\t", 1, TestContext.Current.CancellationToken);

        Assert.Equal(("\t", 3), (detected.Delimiter, detected.Columns.Count));
        Assert.Equal((CsvEncoding.Windows1252, 1, "2026-09-01"), (corrected.Value!.Encoding, corrected.Value.SkipLines, corrected.Value.Columns[0].Name));
    }

    [Fact]
    public async Task Text_without_columns_is_not_a_csv_file()
    {
        var result = await CsvInspector.InspectAsync(new MemoryStream(Utf8("just a note\nnothing else\n")), null, null, null, TestContext.Current.CancellationToken);

        Assert.Equal(ErrorCodes.ImportInvalidFile, result.Error!.Code);
    }

    private static async Task<InspectCsvResponse> InspectAsync(byte[] bytes) =>
        (await CsvInspector.InspectAsync(new MemoryStream(bytes), null, null, null, TestContext.Current.CancellationToken)).Value!;

    private static InspectCsvColumn Column(InspectCsvResponse inspection, string name) =>
        inspection.Columns.Single(c => c.Name == name);
}
