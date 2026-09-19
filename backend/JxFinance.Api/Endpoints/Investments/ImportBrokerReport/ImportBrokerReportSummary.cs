using FastEndpoints;

namespace JxFinance.Endpoints.Investments.ImportBrokerReport;

public sealed class ImportBrokerReportSummary : Summary<ImportBrokerReportEndpoint, ImportBrokerReportRequest>
{
    public ImportBrokerReportSummary()
    {
        Summary = "Import an Interactive Brokers Flex Query report";
        Description = "Reads the Trades, Cash Transactions and Open Positions sections of a Flex Query XML report. Stock, "
            + "ETF, fund and bond trades become buys and sells; currency trades become in-account conversions; dividends, "
            + "withholding tax, interest and fees become cash entries; open positions update last prices. Deposits and "
            + "withdrawals become transfers when a funding account is given and are skipped otherwise. Every entry is "
            + "matched by its broker id, so importing overlapping periods never duplicates. The import is all or nothing.";
        RequestParam(r => r.AccountId, "The account that mirrors the broker account.");
        RequestParam(r => r.FundingAccountId, "Optional bank account that deposits come from and withdrawals go to.");
        Responses[200] = "Counts of what was imported, already present, and skipped.";
        Responses[400] = "The file is not a Flex Query XML report, an account is unknown, or an exchange rate is missing.";
    }
}
