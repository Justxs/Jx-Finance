using FastEndpoints;

namespace JxFinance.Endpoints.Imports.Confirm;

public sealed class ImportConfirmSummary : Summary<ImportConfirmEndpoint, ImportConfirmRequest>
{
    public ImportConfirmSummary()
    {
        Summary = "Commit previewed statement rows";
        Description = "Writes the rows the user kept from a preview into the ledger. Rows the preview "
            + "flagged as already present are skipped rather than duplicated, and the response reports "
            + "how many were imported and how many were skipped.";
        RequestParam(r => r.AccountId, "The account the rows post to; must be the one previewed.");
        RequestParam(r => r.Rows, "The rows to import, as returned by preview, with any category corrections applied.");
        Responses[200] = "Counts of imported and skipped rows.";
        Responses[400] = "Validation failed, or the account is not visible to the signed-in user.";
    }
}
