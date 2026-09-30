using System.Text;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Imports.Parsing;

namespace JxFinance.Tests.Unit;

public sealed class OfxParserTests
{
    private const string Sgml = """
        OFXHEADER:100
        DATA:OFXSGML
        VERSION:102

        <OFX>
        <BANKMSGSRSV1><STMTTRNRS><STMTRS>
        <CURDEF>EUR
        <BANKACCTFROM><BANKID>73000<ACCTID>LT12 1000 0111 0100 1000<ACCTTYPE>CHECKING</BANKACCTFROM>
        <BANKTRANLIST>
        <DTSTART>20260901
        <STMTTRN>
        <TRNTYPE>DEBIT
        <DTPOSTED>20260902120000[+3:EEST]
        <TRNAMT>-15.77
        <FITID>202609020001
        <NAME>LIDL LIETUVA
        <MEMO>PIRKINYS LIDL &amp; CO
        <STMTTRN>
        <TRNTYPE>CREDIT
        <DTPOSTED>20260905
        <TRNAMT>1000,00
        <FITID>202609050002
        <NAME>Employer UAB
        </BANKTRANLIST>
        <LEDGERBAL><BALAMT>2450.10<DTASOF>20260930</LEDGERBAL>
        </STMTRS></STMTTRNRS></BANKMSGSRSV1>
        </OFX>
        """;

    private const string Xml = """
        <?xml version="1.0" encoding="UTF-8"?>
        <?OFX OFXHEADER="200" VERSION="220"?>
        <OFX><CREDITCARDMSGSRSV1><CCSTMTTRNRS><CCSTMTRS>
        <CURDEF>USD</CURDEF>
        <CCACCTFROM><ACCTID>4111</ACCTID></CCACCTFROM>
        <BANKTRANLIST>
        <STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20260910</DTPOSTED><TRNAMT>-42.00</TRNAMT><FITID>X1</FITID><NAME>AMAZON</NAME></STMTTRN>
        <STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20260911</DTPOSTED><TRNAMT>-42.00</TRNAMT><FITID>X1</FITID><NAME>AMAZON</NAME></STMTTRN>
        </BANKTRANLIST>
        </CCSTMTRS></CCSTMTTRNRS></CREDITCARDMSGSRSV1></OFX>
        """;

    [Fact]
    public void An_sgml_statement_reads_its_rows_account_and_closing_balance()
    {
        var statement = Parse(Sgml);

        Assert.Equal(
            [
                ("202609020001", new DateOnly(2026, 9, 2), "LIDL LIETUVA", "PIRKINYS LIDL & CO", 15.77m, FlowType.Expense, Currency.Eur),
                ("202609050002", new DateOnly(2026, 9, 5), "Employer UAB", "Employer UAB", 1000m, FlowType.Income, Currency.Eur),
            ],
            statement.Rows.Select(r => (r.ImportRef, r.Date, r.Payee, r.Description, r.Amount, r.Type, r.Currency)));
        Assert.Equal("LT121000011101001000", statement.Iban);
        Assert.Equal((new DateOnly(2026, 9, 30), new Money(2450.10m, Currency.Eur)), (statement.ClosingDate, statement.ClosingBalance));
    }

    [Fact]
    public void An_xml_credit_card_statement_takes_its_currency_and_keeps_repeated_ids_apart()
    {
        var statement = Parse(Xml);

        Assert.Equal(2, statement.Rows.Count);
        Assert.All(statement.Rows, r => Assert.Equal((Currency.Usd, FlowType.Expense), (r.Currency, r.Type)));
        Assert.NotEqual(statement.Rows[0].ImportRef, statement.Rows[1].ImportRef);
        Assert.Null(statement.Iban);
    }

    [Fact]
    public void A_file_without_an_ofx_element_is_refused()
    {
        var result = OfxParser.Parse(new MemoryStream(Encoding.UTF8.GetBytes("Date,Amount\n2026-09-01,10")), Currency.Eur);

        Assert.Equal(ErrorCodes.ImportInvalidFile, result.Error.Code);
    }

    private static ParsedStatement Parse(string text) =>
        OfxParser.Parse(new MemoryStream(Encoding.UTF8.GetBytes(text)), Currency.Eur).Value!;
}
