using FastEndpoints;

namespace JxFinance.Endpoints.Imports.Confirm;

public sealed class ImportConfirmSummary : Summary<ImportConfirmEndpoint, ImportConfirmRequest>
{
    public ImportConfirmSummary()
    {
        Summary = "Commit previewed statement rows";
        Description = "Writes the rows the user kept from a preview into the ledger. Rows the preview "
            + "flagged as already present are skipped rather than duplicated, and the response reports "
            + "how many were imported and how many were skipped. A row's tagIds are written as they "
            + "arrive, whether a rule suggested them in the preview or the user picked them, so an "
            + "empty list imports the row with no tags.";
        RequestParam(r => r.AccountId, "The account the rows post to; must be the one previewed.");
        RequestParam(r => r.Rows, "The rows to import, as returned by preview, with any category and tag corrections applied.");
        Responses[200] = "Counts of imported and skipped rows.";
        Responses[400] = "Validation failed, a tag is not visible to you, or the account is not visible to the signed-in user.";
    }
}
