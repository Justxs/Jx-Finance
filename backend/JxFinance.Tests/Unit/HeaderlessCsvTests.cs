using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Domain.Imports;
using JxFinance.Endpoints.Imports.Parsing;
using static JxFinance.Tests.Support.SampleCsv;

namespace JxFinance.Tests.Unit;

public sealed class HeaderlessCsvTests
{
    private const string Entries = """
        2026-09-02;Lidl;-15,77;984,23
        2026-09-04;Salary;2000,00;2984,23
        """;

    [Fact]
    public void A_mapping_without_a_header_row_reads_the_first_line_as_an_entry_and_columns_by_position()
    {
        var statement = GenericCsvParser.Parse(new MemoryStream(Utf8(Entries)), Positional(), Currency.Eur).Value!;

        Assert.Equal(
            [(new DateOnly(2026, 9, 2), "Lidl", 15.77m, FlowType.Expense), (new DateOnly(2026, 9, 4), "Salary", 2000m, FlowType.Income)],
            statement.Rows.Select(r => (r.Date, r.Description!, r.Amount, r.Type)));
        Assert.Equal(new Money(2984.23m, Currency.Eur), statement.ClosingBalance);
    }

    [Fact]
    public void The_skipped_lines_sit_above_the_first_entry()
    {
        var statement = GenericCsvParser.Parse(new MemoryStream(Utf8("Account 1234\nPeriod September\n" + Entries)), Positional(skipLines: 2), Currency.Eur).Value!;

        Assert.Equal(2, statement.Rows.Count);
        Assert.Equal(0, statement.Unreadable);
    }

    [Fact]
    public void A_file_with_a_header_reads_with_a_positional_mapping_and_counts_the_header_as_unreadable()
    {
        var statement = GenericCsvParser.Parse(new MemoryStream(Utf8("Date;Text;Amount;Balance\n" + Entries)), Positional(), Currency.Eur).Value!;

        Assert.Equal((2, 1), (statement.Rows.Count, statement.Unreadable));
    }

    [Fact]
    public void A_position_past_the_last_cell_names_the_missing_column()
    {
        var mapping = Positional();
        mapping.Columns = mapping.Columns with { Balance = "7" };

        var result = GenericCsvParser.Parse(new MemoryStream(Utf8(Entries)), mapping, Currency.Eur);

        Assert.Equal(ErrorCodes.ImportMissingColumns, result.ErrorCode);
        Assert.Contains("7", result.ErrorMessage, StringComparison.Ordinal);
    }

    [Fact]
    public async Task A_first_line_holding_a_date_is_proposed_as_the_first_entry_of_a_file_without_a_header()
    {
        var inspection = (await CsvInspector.InspectAsync(new MemoryStream(Utf8(Entries)), null, null, null, null, TestContext.Current.CancellationToken)).Value!;

        Assert.True(inspection.NoHeaderRow);
        Assert.Equal(["1", "2", "3", "4"], inspection.Columns.Select(c => c.Name));
        Assert.Equal(["2026-09-02", "Lidl", "-15,77", "984,23"], inspection.Samples[0]);
        Assert.Equal(2, inspection.Samples.Count);
        Assert.Equal(["yyyy-MM-dd"], inspection.Columns[0].DateFormats);
    }

    [Fact]
    public async Task The_proposal_can_be_overridden_either_way()
    {
        var asHeader = (await CsvInspector.InspectAsync(new MemoryStream(Utf8(Entries)), null, null, null, false, TestContext.Current.CancellationToken)).Value!;
        var positional = (await CsvInspector.InspectAsync(new MemoryStream(Utf8("Date;Text;Amount;Balance\n" + Entries)), null, null, null, true, TestContext.Current.CancellationToken)).Value!;
        var detected = (await CsvInspector.InspectAsync(new MemoryStream(Utf8("Date;Text;Amount;Balance\n" + Entries)), null, null, null, null, TestContext.Current.CancellationToken)).Value!;

        Assert.False(asHeader.NoHeaderRow);
        Assert.Equal(["2026-09-02", "Lidl", "-15,77", "984,23"], asHeader.Columns.Select(c => c.Name));
        Assert.Single(asHeader.Samples);
        Assert.True(positional.NoHeaderRow);
        Assert.Equal(["Date", "Text", "Amount", "Balance"], positional.Samples[0]);
        Assert.False(detected.NoHeaderRow);
        Assert.Equal(["Date", "Text", "Amount", "Balance"], detected.Columns.Select(c => c.Name));
    }

    [Fact]
    public async Task A_single_entry_without_a_header_is_enough_to_inspect()
    {
        var inspection = (await CsvInspector.InspectAsync(new MemoryStream(Utf8("2026-09-02;Lidl;-15,77;984,23\n")), null, null, null, null, TestContext.Current.CancellationToken)).Value!;

        Assert.True(inspection.NoHeaderRow);
        Assert.Single(inspection.Samples);
    }

    [Theory]
    [InlineData("1", true)]
    [InlineData("100", true)]
    [InlineData("0", false)]
    [InlineData("101", false)]
    [InlineData("+1", false)]
    [InlineData("Date", false)]
    public void A_position_is_a_whole_number_from_one_to_one_hundred(string name, bool position) =>
        Assert.Equal(position, CsvColumnMap.IsPosition(name));

    private static CsvImportMapping Positional(int skipLines = 0) => new()
    {
        Name = "Headerless",
        Delimiter = ";",
        SkipLines = skipLines,
        NoHeaderRow = true,
        DateFormat = "yyyy-MM-dd",
        DecimalSeparator = CsvDecimalSeparator.Comma,
        AmountStyle = CsvAmountStyle.SignedNegativeIsExpense,
        Columns = new CsvColumnMap { Date = "1", Description = "2", Amount = "3", Balance = "4" },
    };
}
