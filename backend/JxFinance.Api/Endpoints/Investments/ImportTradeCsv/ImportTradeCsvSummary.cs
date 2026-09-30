using FastEndpoints;

namespace JxFinance.Endpoints.Investments.ImportTradeCsv;

public sealed class ImportTradeCsvSummary : Summary<ImportTradeCsvEndpoint, ImportTradeCsvRequest>
{
    public ImportTradeCsvSummary()
    {
        Summary = "Import trades from any broker as CSV";
        Description = "Reads a CSV with a header row: Date (YYYY-MM-DD), Type (buy, sell, dividend, withholdingTax, interest "
            + "or fee) and Currency are required; Symbol, Quantity and Price are required for a buy or sell and Amount for "
            + "the other types; Fee, Name, Isin, SecurityType (stock, etf or fund), Description and Id are optional. The "
            + "delimiter is detected, and a number may use a decimal point or a decimal comma. Buys and sells become trades "
            + "whose fee is part of the cost, the other types become cash entries, and a security is matched by ISIN or by "
            + "symbol and currency, or created. Every row is matched by its Id or, without one, by a hash of the row, so "
            + "importing the same file twice never duplicates. The import is all or nothing and refuses a sale of more than "
            + "was held. Rows that cannot be read are counted in skipped.";
        RequestParam(r => r.AccountId, "The account that holds the investments.");
        Responses[200] = "Counts of what was imported, already present, and skipped.";
        Responses[400] = "The file is not a trade CSV, the account is unknown, an exchange rate is missing, or a sale oversells a holding.";
        Responses[409] = "A security in the file kept colliding with one created at the same time. Nothing was imported; retry.";
    }
}
