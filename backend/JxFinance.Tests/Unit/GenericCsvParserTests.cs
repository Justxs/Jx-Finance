using System.Text;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Domain.Imports;
using JxFinance.Endpoints.Imports.Parsing;
using static JxFinance.Tests.Support.SampleCsv;

namespace JxFinance.Tests.Unit;

public sealed class GenericCsvParserTests
{
    [Fact]
    public void A_revolut_export_filters_pending_rows_adds_the_fee_and_keeps_each_currency()
    {
        var statement = Parse(Revolut, RevolutMapping);

        Assert.Equal(
            [
                (new DateOnly(2026, 9, 2), "Lidl", 15.77m, FlowType.Expense, Currency.Eur),
                (new DateOnly(2026, 9, 3), "Coffee", 3.50m, FlowType.Expense, Currency.Eur),
                (new DateOnly(2026, 9, 4), "Top-up by *1234", 500.00m, FlowType.Income, Currency.Eur),
                (new DateOnly(2026, 9, 5), "Cash at Vilnius", 10.50m, FlowType.Expense, Currency.Eur),
                (new DateOnly(2026, 9, 6), "Netflix", 9.99m, FlowType.Expense, Currency.Usd),
            ],
            statement.Rows.Select(r => (r.Date, r.Description!, r.Amount, r.Type, r.Currency)));
        Assert.All(statement.Rows, r => Assert.StartsWith("h:", r.ImportRef, StringComparison.Ordinal));
        Assert.Equal((1, 0), (statement.NotBooked, statement.Unreadable));
        Assert.Equal((new DateOnly(2026, 9, 6), new Money(40.01m, Currency.Usd)), (statement.ClosingDate, statement.ClosingBalance));
    }

    [Fact]
    public void A_wise_export_uses_its_reference_and_payee()
    {
        var statement = Parse(Wise, WiseMapping);

        Assert.Equal(["TRANSFER-1001", "CARD-2002", "TRANSFER-1003"], statement.Rows.Select(r => r.ImportRef));
        Assert.Equal(("Jonas", new DateOnly(2026, 9, 1)), (statement.Rows[0].Payee, statement.Rows[0].Date));
        Assert.Equal((300.00m, FlowType.Income), (statement.Rows[2].Amount, statement.Rows[2].Type));
        Assert.Equal(new Money(1262.60m, Currency.Eur), statement.ClosingBalance);
    }

    [Fact]
    public void A_card_statement_reads_a_purchase_as_an_expense_and_a_payment_or_refund_as_income()
    {
        var statement = Parse(CardStatement, CardMapping);

        Assert.Equal(
            [
                ("Payment - thank you", 150.00m, FlowType.Income),
                ("Refund Zara", 19.99m, FlowType.Income),
                ("Zara", 49.99m, FlowType.Expense),
                ("Maxima", 170.00m, FlowType.Expense),
            ],
            statement.Rows.Select(r => (r.Description!, r.Amount, r.Type)));
        Assert.Equal(1, statement.Unreadable);
        Assert.Equal((new DateOnly(2026, 9, 30), new Money(-50.00m, Currency.Eur)), (statement.ClosingDate, statement.ClosingBalance));
    }

    [Fact]
    public void A_windows_1257_file_with_debit_and_credit_columns_keeps_its_letters()
    {
        var statement = GenericCsvParser.Parse(new MemoryStream(Windows1257(Lithuanian)), LithuanianMapping, Currency.Usd).Value!;

        Assert.Equal(
            [
                ("Pirkinys ąčęėįšųūž", "Žalgirio arena", 1234.56m, FlowType.Expense, Currency.Eur),
                ("Atlyginimas", "Įmonė UAB", 2000.00m, FlowType.Income, Currency.Eur),
            ],
            statement.Rows.Select(r => (r.Description!, r.Payee!, r.Amount, r.Type, r.Currency)));
        Assert.Equal(1, statement.Unreadable);
    }

    [Fact]
    public void An_amount_with_a_direction_column_is_money_out_when_the_direction_says_so()
    {
        var mapping = Mapping("Date;Text;Sum;D/K", CsvAmountStyle.AmountWithDirection) with
        {
            Columns = new CsvColumnMap { Date = "Date", Description = "Text", Amount = "Sum", Direction = "D/K", ExpenseValue = "d" },
        };

        var statement = Parse("Date;Text;Sum;D/K\n2026-09-01;Shop;12.00;D\n2026-09-02;Pay;100.00;K\n", mapping.Build());

        Assert.Equal([FlowType.Expense, FlowType.Income], statement.Rows.Select(r => r.Type));
    }

    [Fact]
    public void A_column_the_mapping_names_but_the_file_lacks_is_named_in_the_error()
    {
        var mapping = RevolutMapping;
        mapping.Columns = mapping.Columns with { Reference = "ID" };

        var result = GenericCsvParser.Parse(new MemoryStream(Utf8(Revolut)), mapping, Currency.Eur);

        Assert.Equal(ErrorCodes.ImportMissingColumns, result.Error!.Code);
        Assert.Contains("\"ID\"", result.Error.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void A_zero_amount_is_left_out_and_counted()
    {
        var statement = Parse("Date,Text,Amount\n2026-09-01,Shop,0.00\n2026-09-02,Pay,1.00\n", Mapping("Date,Text,Amount").Build());

        Assert.Equal((1, 1), (statement.Rows.Count, statement.NotBooked));
    }

    [Fact]
    public void A_reference_that_is_too_long_is_hashed_and_a_repeated_one_is_told_apart()
    {
        var mapping = Mapping("Date,Text,Amount,Id").Build();
        mapping.Columns = mapping.Columns with { Reference = "Id" };
        var csv = $"Date,Text,Amount,Id\n2026-09-01,A,-1.00,{new string('x', 65)}\n2026-09-02,B,-2.00,SAME\n2026-09-03,C,-3.00,SAME\n";

        var refs = Parse(csv, mapping).Rows.Select(r => r.ImportRef).ToList();

        Assert.StartsWith("h:", refs[0], StringComparison.Ordinal);
        Assert.Equal("SAME", refs[1]);
        Assert.NotEqual("SAME", refs[2]);
        Assert.Equal(refs, Parse(csv, mapping).Rows.Select(r => r.ImportRef));
    }

    [Fact]
    public void Two_equal_coffees_get_their_own_references_that_survive_a_longer_export()
    {
        const string header = "Date,Text,Amount,Balance\n";
        const string coffees = "2026-09-01,Coffee,-3.00,97.00\n2026-09-01,Coffee,-3.00,94.00\n";
        var mapping = Mapping("Date,Text,Amount") with { Balance = "Balance" };

        var first = Parse(header + coffees, mapping.Build()).Rows.Select(r => r.ImportRef).ToList();
        var longer = Parse(header + "2026-08-31,Rent,-500.00,100.00\n" + coffees + "2026-09-02,Pay,10.00,104.00\n", mapping.Build())
            .Rows.Select(r => r.ImportRef).ToList();

        Assert.Equal(2, first.Distinct().Count());
        Assert.Equal(first, longer.Skip(1).Take(2));
    }

    [Fact]
    public void An_oldest_first_file_closes_on_its_last_row()
    {
        var mapping = Mapping("Date,Text,Amount") with { Balance = "Balance" };

        var statement = Parse("Date,Text,Amount,Balance\n2026-09-01,A,-1.00,99.00\n2026-09-02,B,-2.00,97.00\n", mapping.Build());

        Assert.Equal((new DateOnly(2026, 9, 2), new Money(97.00m, Currency.Eur)), (statement.ClosingDate, statement.ClosingBalance));
    }

    [Theory]
    [InlineData("utf-8")]
    [InlineData("utf-16")]
    public void A_byte_order_mark_decides_the_encoding(string name)
    {
        var encoding = Encoding.GetEncoding(name);
        var bytes = encoding.GetPreamble().Concat(encoding.GetBytes("Data,Tekstas,Suma\n2026-09-01,Žuvis,-1.00\n")).ToArray();
        var mapping = Mapping("Data,Tekstas,Suma").Build();
        mapping.Encoding = CsvEncoding.Windows1252;

        var row = Assert.Single(GenericCsvParser.Parse(new MemoryStream(bytes), mapping, Currency.Eur).Value!.Rows);

        Assert.Equal("Žuvis", row.Description);
    }

    [Fact]
    public void A_tab_delimited_file_is_read()
    {
        var mapping = Mapping("Date\tText\tAmount").Build();
        mapping.Delimiter = "\t";

        var row = Assert.Single(Parse("Date\tText\tAmount\n2026-09-01\tShop, Vilnius\t-4.20\n", mapping).Rows);

        Assert.Equal(("Shop, Vilnius", 4.20m), (row.Description, row.Amount));
    }

    [Fact]
    public void A_file_with_only_a_header_is_not_a_statement()
    {
        var result = GenericCsvParser.Parse(new MemoryStream(Utf8("Date,Text,Amount\n")), Mapping("Date,Text,Amount").Build(), Currency.Eur);

        Assert.Equal(ErrorCodes.ImportInvalidFile, result.Error!.Code);
    }

    [Theory]
    [InlineData("-12.50", CsvDecimalSeparator.Dot, "-12.50")]
    [InlineData("1,234.56", CsvDecimalSeparator.Dot, "1234.56")]
    [InlineData("1.234,56", CsvDecimalSeparator.Comma, "1234.56")]
    [InlineData("1 234,56", CsvDecimalSeparator.Comma, "1234.56")]
    [InlineData("1 234,56", CsvDecimalSeparator.Comma, "1234.56")]
    [InlineData("(12.50)", CsvDecimalSeparator.Dot, "-12.50")]
    [InlineData("12,50-", CsvDecimalSeparator.Comma, "-12.50")]
    [InlineData("€ -3.10", CsvDecimalSeparator.Dot, "-3.10")]
    [InlineData("3.10 EUR", CsvDecimalSeparator.Dot, "3.10")]
    [InlineData("1'000.00", CsvDecimalSeparator.Dot, "1000.00")]
    public void Numbers_are_read_with_the_chosen_decimal_mark(string text, CsvDecimalSeparator separator, string expected)
    {
        Assert.True(CsvText.TryNumber(text, separator, out var value));
        Assert.Equal(decimal.Parse(expected, System.Globalization.CultureInfo.InvariantCulture), value);
    }

    [Theory]
    [InlineData("1.234", CsvDecimalSeparator.Dot)]
    [InlineData("1.2.3", CsvDecimalSeparator.Dot)]
    public void A_number_with_more_than_two_decimals_is_unreadable(string text, CsvDecimalSeparator separator) =>
        Assert.False(CsvText.TryNumber(text, separator, out _));

    [Theory]
    [InlineData("2026-09-01", "yyyy-MM-dd")]
    [InlineData("2026-09-01T10:15:00Z", "yyyy-MM-dd")]
    [InlineData("01.09.2026", "dd.MM.yyyy")]
    [InlineData("01.09.2026 10:15", "dd.MM.yyyy")]
    [InlineData("01/09/2026", "dd/MM/yyyy")]
    [InlineData("09/01/2026", "MM/dd/yyyy")]
    [InlineData("01-09-2026", "dd-MM-yyyy")]
    [InlineData("2026.09.01", "yyyy.MM.dd")]
    [InlineData("2026/09/01 23:59:59", "yyyy/MM/dd")]
    [InlineData("1.9.2026", "d.M.yyyy")]
    public void Each_listed_date_format_is_read_with_or_without_a_time(string text, string format)
    {
        Assert.Contains(format, CsvDateFormats.All);
        Assert.Equal(new DateOnly(2026, 9, 1), CsvText.Date(text, format));
    }

    private static ParsedStatement Parse(string csv, CsvImportMapping mapping) =>
        GenericCsvParser.Parse(new MemoryStream(Utf8(csv)), mapping, Currency.Eur).Value!;

    private static MappingDraft Mapping(string header, CsvAmountStyle style = CsvAmountStyle.SignedNegativeIsExpense)
    {
        var delimiter = header.Contains(';', StringComparison.Ordinal) ? ";" : header.Contains('\t', StringComparison.Ordinal) ? "\t" : ",";
        var names = header.Split(delimiter);
        return new MappingDraft(
            delimiter,
            style,
            new CsvColumnMap { Date = names[0], Description = names[1], Amount = names[2] },
            null);
    }

    private sealed record MappingDraft(string Delimiter, CsvAmountStyle Style, CsvColumnMap Columns, string? Balance)
    {
        public CsvImportMapping Build() => new()
        {
            Name = "Test",
            Delimiter = Delimiter,
            DateFormat = "yyyy-MM-dd",
            AmountStyle = Style,
            Columns = Columns with { Balance = Balance },
        };
    }
}
