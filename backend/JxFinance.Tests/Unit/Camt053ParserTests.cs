using System.Text;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Imports.Parsing;
using static JxFinance.Tests.Support.SampleCamt053;

namespace JxFinance.Tests.Unit;

public sealed class Camt053ParserTests
{
    private static readonly TimeZoneInfo Vilnius = TimeZoneInfo.FindSystemTimeZoneById("Europe/Vilnius");

    [Theory]
    [InlineData("001.02", "<Sts>BOOK</Sts>", "<Cdtr><Nm>LIDL LIETUVA</Nm></Cdtr>")]
    [InlineData("001.08", "<Sts><Cd>BOOK</Cd></Sts>", "<Cdtr><Pty><Nm>LIDL LIETUVA</Nm></Pty></Cdtr>")]
    public async Task A_booked_debit_is_read_in_both_schema_shapes(string version, string status, string creditor)
    {
        var xml = OneEntry(Entry(Detail(parties: creditor + "<CdtrAcct><Id><IBAN>lt11 2222 3333 4444 5555</IBAN></Id></CdtrAcct>"), status: status), version);

        var statement = await ParseAsync(xml);

        var row = Assert.Single(statement.Rows);
        Assert.Equal(
            ("D-1", new DateOnly(2026, 9, 2), "LIDL LIETUVA", "PIRKINYS LIDL", 15.77m, FlowType.Expense, Currency.Eur, "LT112222333344445555", false),
            (row.ImportRef, row.Date, row.Payee, row.Description, row.Amount, row.Type, row.Currency, row.CounterpartyIban, row.IsReversal));
        Assert.Equal(Iban, statement.Iban);
    }

    [Fact]
    public async Task A_credit_takes_the_debtor_as_payee_and_a_reversal_is_flagged()
    {
        var detail = Detail(parties: "<Dbtr><Nm>Employer UAB</Nm></Dbtr><DbtrAcct><Id><IBAN>LT601010012345678901</IBAN></Id></DbtrAcct><Cdtr><Nm>Me</Nm></Cdtr>");
        var xml = OneEntry(Entry(detail, amount: "1000.00", direction: "CRDT", extra: "<RvslInd>true</RvslInd>"));

        var row = Assert.Single((await ParseAsync(xml)).Rows);

        Assert.Equal((FlowType.Income, "Employer UAB", OtherIban, true), (row.Type, row.Payee, row.CounterpartyIban, row.IsReversal));
    }

    [Fact]
    public async Task Two_identical_entries_without_references_get_distinct_stable_references()
    {
        var entry = Entry(Detail(refs: "<EndToEndId>NOTPROVIDED</EndToEndId>"), refs: "");
        var xml = Document(Statement(entry + entry));

        var first = (await ParseAsync(xml)).Rows.Select(r => r.ImportRef).ToList();
        var again = (await ParseAsync(xml)).Rows.Select(r => r.ImportRef).ToList();

        Assert.Equal(2, first.Distinct().Count());
        Assert.Equal(first, again);
    }

    [Fact]
    public async Task Every_statement_for_the_account_is_read_and_the_latest_closing_balance_wins()
    {
        var early = Statement(Entry(Detail(refs: "<AcctSvcrRef>A</AcctSvcrRef>")));
        var late = Statement(Entry(Detail(refs: "<AcctSvcrRef>B</AcctSvcrRef>")), closing: "<Amt Ccy=\"EUR\">900.00</Amt><CdtDbtInd>CRDT</CdtDbtInd>")
            .Replace("<Dt>2026-09-30</Dt>", "<Dt>2026-10-31</Dt>", StringComparison.Ordinal);

        var statement = await ParseAsync(Document(early + late + Statement(Entry(), OtherIban)));

        Assert.Equal(["A", "B"], statement.Rows.Select(r => r.ImportRef));
        Assert.Equal((new DateOnly(2026, 10, 31), 900m), (statement.ClosingDate, statement.ClosingBalance!.Value.Amount));
    }

    [Fact]
    public async Task A_booking_time_is_read_in_the_installation_time_zone()
    {
        var xml = OneEntry(Entry(Detail(), date: "<BookgDt><DtTm>2026-09-01T22:30:00Z</DtTm></BookgDt>"));

        Assert.Equal(new DateOnly(2026, 9, 2), Assert.Single((await ParseAsync(xml)).Rows).Date);
    }

    [Fact]
    public async Task A_booking_time_without_an_offset_is_already_local()
    {
        var xml = OneEntry(Entry(Detail(), date: "<BookgDt><DtTm>2026-09-01T22:30:00</DtTm></BookgDt>"));

        Assert.Equal(new DateOnly(2026, 9, 1), Assert.Single((await ParseAsync(xml)).Rows).Date);
    }

    [Fact]
    public async Task Without_a_booking_date_the_value_date_is_used()
    {
        var xml = OneEntry(Entry(Detail(), date: ""));

        Assert.Equal(new DateOnly(2026, 9, 3), Assert.Single((await ParseAsync(xml)).Rows).Date);
    }

    [Fact]
    public async Task A_batch_whose_details_add_up_becomes_one_row_per_detail()
    {
        var details = Detail(refs: "", amount: "<Amt Ccy=\"EUR\">10.00</Amt>", remittance: "<Ustrd>First</Ustrd>")
            + Detail(refs: "", amount: "<AmtDtls><TxAmt><Amt Ccy=\"EUR\">20.00</Amt></TxAmt></AmtDtls>", remittance: "<Ustrd>Second</Ustrd>");
        var xml = OneEntry(Entry(details, amount: "30.00"));

        var rows = (await ParseAsync(xml)).Rows;

        Assert.Equal([("E-1/0", 10m, "First"), ("E-1/1", 20m, "Second")], rows.Select(r => (r.ImportRef, r.Amount, r.Description)));
    }

    [Fact]
    public async Task A_batch_whose_details_do_not_add_up_stays_one_row_with_the_entry_text()
    {
        var details = Detail(amount: "<Amt Ccy=\"EUR\">10.00</Amt>") + Detail(amount: "<Amt Ccy=\"EUR\">15.00</Amt>");
        var xml = OneEntry(Entry(details, amount: "30.00"));

        var row = Assert.Single((await ParseAsync(xml)).Rows);

        Assert.Equal(("E-1", 30m, "Entry text", (string?)null), (row.ImportRef, row.Amount, row.Description, row.Payee));
    }

    [Fact]
    public async Task Pending_and_informational_entries_are_counted_and_unreadable_entries_are_counted_apart()
    {
        var entries = Entry(Detail(), status: "<Sts>PDNG</Sts>")
            + Entry(Detail(), status: "<Sts><Cd>INFO</Cd></Sts>")
            + Entry(Detail(), amount: "abc")
            + Entry(Detail());

        var statement = await ParseAsync(Document(Statement(entries)));

        Assert.Equal((1, 2, 1), (statement.Rows.Count, statement.NotBooked, statement.Unreadable));
    }

    [Theory]
    [InlineData("<AcctSvcrRef>D-1</AcctSvcrRef>", "<AcctSvcrRef>E-1</AcctSvcrRef><NtryRef>N-1</NtryRef>", "D-1")]
    [InlineData("<EndToEndId>X-1</EndToEndId>", "<AcctSvcrRef>E-1</AcctSvcrRef><NtryRef>N-1</NtryRef>", "E-1")]
    [InlineData("<EndToEndId>X-1</EndToEndId>", "<NtryRef>N-1</NtryRef>", "N-1")]
    [InlineData("<EndToEndId>X-1</EndToEndId>", "", "X-1")]
    [InlineData("<EndToEndId>NOTPROVIDED</EndToEndId>", "<AcctSvcrRef>NOTPROVIDED</AcctSvcrRef>", null)]
    [InlineData("", "", null)]
    [InlineData("<AcctSvcrRef>12345678901234567890123456789012345678901234567890123456789012345</AcctSvcrRef>", "", null)]
    public async Task The_reference_falls_back_in_order_and_ends_in_a_hash(string detailRefs, string entryRefs, string? expected)
    {
        var xml = OneEntry(Entry(Detail(refs: detailRefs), refs: entryRefs));

        var first = Assert.Single((await ParseAsync(xml)).Rows).ImportRef;
        var second = Assert.Single((await ParseAsync(xml)).Rows).ImportRef;

        Assert.Equal(first, second);
        if (expected is null)
        {
            Assert.StartsWith("h:", first, StringComparison.Ordinal);
            Assert.InRange(first.Length, 3, 64);
        }
        else
        {
            Assert.Equal(expected, first);
        }
    }

    [Fact]
    public async Task Unstructured_lines_are_joined_and_clipped()
    {
        var text = new string('x', 600);
        var joined = OneEntry(Entry(Detail(remittance: "<Ustrd>Invoice 12</Ustrd><Ustrd> for September </Ustrd>")));
        var clipped = OneEntry(Entry(Detail(remittance: $"<Ustrd>{text}</Ustrd>")));
        var structured = OneEntry(Entry(Detail(remittance: "<Strd><CdtrRefInf><Ref>RF18539007547034</Ref></CdtrRefInf></Strd>")));

        Assert.Equal("Invoice 12 for September", Assert.Single((await ParseAsync(joined)).Rows).Description);
        Assert.Equal(500, Assert.Single((await ParseAsync(clipped)).Rows).Description!.Length);
        Assert.Equal("RF18539007547034", Assert.Single((await ParseAsync(structured)).Rows).Description);
    }

    [Fact]
    public async Task The_closing_balance_is_read_with_its_sign()
    {
        var xml = Document(Statement(Entry(Detail()), closing: "<Amt Ccy=\"EUR\">12.50</Amt><CdtDbtInd>DBIT</CdtDbtInd>"));

        var statement = await ParseAsync(xml);

        Assert.Equal((new DateOnly(2026, 9, 30), new Money(-12.50m, Currency.Eur)), (statement.ClosingDate, statement.ClosingBalance));
    }

    [Fact]
    public async Task Of_several_statements_the_one_for_the_account_is_read()
    {
        var xml = Document(Statement(Entry(Detail(refs: "<AcctSvcrRef>OTHER</AcctSvcrRef>")), OtherIban) + Statement(Entry(Detail())));

        var statement = await ParseAsync(xml);

        Assert.Equal((Iban, "D-1"), (statement.Iban, Assert.Single(statement.Rows).ImportRef));
    }

    [Fact]
    public async Task Several_statements_none_for_the_account_are_refused_naming_their_ibans()
    {
        var xml = Document(Statement(Entry(Detail()), OtherIban) + Statement(Entry(Detail()), "LT000000000000000001"));

        var result = await Camt053Parser.ParseAsync(Stream(xml), Iban, Vilnius, CancellationToken.None);

        Assert.Equal(ErrorCodes.ImportNoStatementForAccount, result.ErrorCode);
        Assert.Contains(OtherIban, result.ErrorMessage, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("<Document xmlns=\"urn:iso:std:iso:20022:tech:xsd:camt.052.001.02\"><BkToCstmrAcctRpt /></Document>")]
    [InlineData("<Statement xmlns=\"urn:iso:std:iso:20022:tech:xsd:camt.053.001.02\" />")]
    [InlineData("<Document xmlns=\"urn:iso:std:iso:20022:tech:xsd:camt.053.001.02\"><BkToCstmrStmt /></Document>")]
    [InlineData("Sąskaitos Nr.,,Data")]
    public async Task Other_documents_are_refused(string xml)
    {
        var result = await Camt053Parser.ParseAsync(Stream(xml), Iban, Vilnius, CancellationToken.None);

        Assert.Equal(ErrorCodes.ImportInvalidFile, result.ErrorCode);
    }

    [Fact]
    public async Task A_document_type_declaration_is_refused()
    {
        var xml = """
            <?xml version="1.0"?>
            <!DOCTYPE Document [<!ENTITY secret SYSTEM "file:///c:/windows/win.ini">]>
            <Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.02"><BkToCstmrStmt><Stmt><Ntry><AddtlNtryInf>&secret;</AddtlNtryInf></Ntry></Stmt></BkToCstmrStmt></Document>
            """;

        var result = await Camt053Parser.ParseAsync(Stream(xml), Iban, Vilnius, CancellationToken.None);

        Assert.Equal(ErrorCodes.ImportInvalidFile, result.ErrorCode);
    }

    private static async Task<ParsedStatement> ParseAsync(string xml)
    {
        var result = await Camt053Parser.ParseAsync(Stream(xml), Iban, Vilnius, CancellationToken.None);
        Assert.True(result.IsSuccess, result.ErrorMessage);
        return result.Value!;
    }

    private static MemoryStream Stream(string xml) => new(Encoding.UTF8.GetBytes(xml));
}
