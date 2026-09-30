using FastEndpoints;
using JxFinance.Endpoints.Imports.Shared;

namespace JxFinance.Endpoints.Imports.Preview;

public sealed class ImportPreviewSummary : Summary<ImportPreviewEndpoint, ImportPreviewRequest>
{
    public ImportPreviewSummary()
    {
        Summary = "Preview a bank statement";
        Description = "Parses an exported bank statement and returns the rows it found, each with "
            + "a flag saying whether a matching transaction already exists in the account. Three formats "
            + "are read: swedbankCsv, the Swedbank CSV export, camt053, an ISO 20022 camt.053 XML "
            + "statement, and genericCsv, any CSV export read through the saved column mapping named by mappingId. "
            + "From a camt.053 file only booked entries are returned; pending and "
            + "informational entries and entries that could not be read are counted in statement. A mapped CSV counts "
            + "rows its status filter leaves out or whose amount is zero in notBooked and rows it cannot read in unreadable, "
            + "and with a balance column answers the balance of its latest row as the closing balance. "
            + "When the file holds several statements, the one for the account's IBAN is read. A "
            + "counterparty IBAN that belongs to another of your accounts fills in "
            + "suggestedTransferAccountId. Your categorization rules are evaluated against each row's "
            + "description, amount and flow type, and the first rule that matches fills in "
            + "suggestedCategoryId, suggestedTagIds and matchedRuleName; a row nothing matched carries "
            + "none of them. The suggestion is a suggestion: confirm sends back whatever the client "
            + "decided. A row that is not a duplicate and has the same flow type, amount and currency "
            + "as a transaction entered by hand on the account within three days of it carries that "
            + "transaction in matchedTransaction, each transaction offered to one row at most, the "
            + "closest date first. An incoming row that is neither a duplicate nor matched carries refundCandidate when an expense on the "
            + "account, not a refund, in the same currency, of at least the row's amount and dated at most 90 days before it has the "
            + "same normalized payee or description as the row; the most recent such expense wins. Nothing is written: this call only reads the file. Send the file as "
            + "multipart/form-data.";
        Params["file"] = "The statement file, at most 5 MB for a CSV file and 20 MB for an XML file.";
        Params["accountId"] = "The account the statement belongs to.";
        Params["format"] = ImportFormatText.Format;
        Params["mappingId"] = "The saved CSV column mapping to read the file with; required for genericCsv and ignored otherwise.";
        Responses[200] = "The parsed rows with suggestions and duplicate flags, and what the statement says about its account and closing balance.";
        Responses[400] = "No file, a file over the size limit, an unreadable statement, a file with no statement for this account, a CSV without a column the mapping names (import.missingColumns), or an account or mapping that is not yours.";
    }
}
