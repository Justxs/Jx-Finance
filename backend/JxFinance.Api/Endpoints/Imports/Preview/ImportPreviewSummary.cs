using FastEndpoints;

namespace JxFinance.Endpoints.Imports.Preview;

public sealed class ImportPreviewSummary : Summary<ImportPreviewEndpoint, ImportPreviewRequest>
{
    public ImportPreviewSummary()
    {
        Summary = "Preview a bank statement";
        Description = "Parses an exported bank statement and returns the rows it found, each with "
            + "a flag saying whether a matching transaction already exists in the account. Two formats "
            + "are read: swedbankCsv, the Swedbank CSV export, and camt053, an ISO 20022 camt.053 XML "
            + "statement. From a camt.053 file only booked entries are returned; pending and "
            + "informational entries and entries that could not be read are counted in statement. "
            + "When the file holds several statements, the one for the account's IBAN is read. A "
            + "counterparty IBAN that belongs to another of your accounts fills in "
            + "suggestedTransferAccountId. Your categorization rules are evaluated against each row's "
            + "description, amount and flow type, and the first rule that matches fills in "
            + "suggestedCategoryId, suggestedTagIds and matchedRuleName; a row nothing matched carries "
            + "none of them. The suggestion is a suggestion: confirm sends back whatever the client "
            + "decided. A row that is not a duplicate and has the same flow type, amount and currency "
            + "as a transaction entered by hand on the account within three days of it carries that "
            + "transaction in matchedTransaction, each transaction offered to one row at most, the "
            + "closest date first. Nothing is written: this call only reads the file. Send the file as "
            + "multipart/form-data.";
        Params["file"] = "The statement file, at most 5 MB for a CSV file and 20 MB for an XML file.";
        Params["accountId"] = "The account the statement belongs to.";
        Params["format"] = "The statement format: swedbankCsv for a Swedbank CSV export or camt053 for an ISO 20022 camt.053 XML statement.";
        Responses[200] = "The parsed rows with suggestions and duplicate flags, and what the statement says about its account and closing balance.";
        Responses[400] = "No file, a file over the size limit, an unreadable statement, a file with no statement for this account, or an account that is not yours.";
    }
}
