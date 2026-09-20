using FastEndpoints;

namespace JxFinance.Endpoints.Investments.ImportBrokerReport;

public sealed class ImportBrokerReportSummary : Summary<ImportBrokerReportEndpoint, ImportBrokerReportRequest>
{
    public ImportBrokerReportSummary()
    {
        Summary = "Import an Interactive Brokers Flex Query report";
        Description = "Reads the Trades, Cash Transactions, Corporate Actions and Open Positions sections of a Flex Query XML "
            + "report. Stock, ETF and fund trades become buys and sells; currency trades become in-account conversions; "
            + "dividends, withholding tax, interest and fees become cash entries; forward and reverse splits become split "
            + "entries with the ratio as new shares per old share; open positions update last prices. Deposits and "
            + "withdrawals become transfers when a funding account is given and are skipped otherwise. Every entry is "
            + "matched by its broker id, so importing overlapping periods never duplicates. The import is all or nothing. "
            + "Other corporate actions (mergers, spin-offs, stock dividends, symbol changes) are not booked: they are "
            + "counted in skipped and listed per type in skippedCorporateActions. When the report has an Open Positions "
            + "section, positionMismatches lists every security whose quantity replayed from the entries differs from "
            + "the quantity the broker reports, which is how an action that was not booked becomes visible; it is "
            + "null when the report has no Open Positions section.";
        RequestParam(r => r.AccountId, "The account that mirrors the broker account.");
        RequestParam(r => r.FundingAccountId, "Optional bank account that deposits come from and withdrawals go to.");
        Responses[200] = "Counts of what was imported, already present, and skipped, and the positions that do not reconcile.";
        Responses[400] = "The file is not a Flex Query XML report, an account is unknown, or an exchange rate is missing.";
        Responses[409] = "A security in the report kept colliding with one created at the same time. Nothing was imported; retry.";
    }
}
