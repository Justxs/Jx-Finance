namespace JxFinance.Tests.Support;

public static class SampleCamt053
{
    public const string Iban = "LT121000011101001000";
    public const string OtherIban = "LT601010012345678901";

    public static string Document(string statements, string version = "001.02") => $"""
        <?xml version="1.0" encoding="UTF-8"?>
        <Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.{version}">
          <BkToCstmrStmt>
            <GrpHdr><MsgId>MSG-1</MsgId><CreDtTm>2026-09-30T08:00:00</CreDtTm></GrpHdr>
            {statements}
          </BkToCstmrStmt>
        </Document>
        """;

    public static string Statement(string entries, string iban = Iban, string closing = "<Amt Ccy=\"EUR\">1250.40</Amt><CdtDbtInd>CRDT</CdtDbtInd>") => $"""
        <Stmt>
          <Id>STMT-{iban}</Id>
          <Acct><Id><IBAN>{iban}</IBAN></Id><Ccy>EUR</Ccy></Acct>
          <Bal><Tp><CdOrPrtry><Cd>OPBD</Cd></CdOrPrtry></Tp><Amt Ccy="EUR">1000.00</Amt><CdtDbtInd>CRDT</CdtDbtInd><Dt><Dt>2026-09-01</Dt></Dt></Bal>
          <Bal><Tp><CdOrPrtry><Cd>CLBD</Cd></CdOrPrtry></Tp>{closing}<Dt><Dt>2026-09-30</Dt></Dt></Bal>
          {entries}
        </Stmt>
        """;

    public static string Entry(
        string details = "",
        string amount = "15.77",
        string direction = "DBIT",
        string status = "<Sts>BOOK</Sts>",
        string date = "<BookgDt><Dt>2026-09-02</Dt></BookgDt>",
        string refs = "<AcctSvcrRef>E-1</AcctSvcrRef>",
        string extra = "") => $"""
        <Ntry>
          {refs}
          <Amt Ccy="EUR">{amount}</Amt>
          <CdtDbtInd>{direction}</CdtDbtInd>
          {extra}
          {status}
          {date}
          <ValDt><Dt>2026-09-03</Dt></ValDt>
          <AddtlNtryInf>Entry text</AddtlNtryInf>
          <NtryDtls>{details}</NtryDtls>
        </Ntry>
        """;

    public static string Detail(
        string parties = "<Cdtr><Nm>LIDL LIETUVA</Nm></Cdtr><CdtrAcct><Id><IBAN>LT11 2222 3333 4444 5555</IBAN></Id></CdtrAcct>",
        string remittance = "<Ustrd>PIRKINYS LIDL</Ustrd>",
        string refs = "<AcctSvcrRef>D-1</AcctSvcrRef>",
        string amount = "") => $"""
        <TxDtls>
          <Refs>{refs}</Refs>
          {amount}
          <RltdPties>{parties}</RltdPties>
          <RmtInf>{remittance}</RmtInf>
        </TxDtls>
        """;

    public static string OneEntry(string entry, string version = "001.02") => Document(Statement(entry), version);
}
