using FastEndpoints;

namespace JxFinance.Endpoints.Imports.DismissImportInboxFile;

public sealed class DismissImportInboxFileSummary : Summary<DismissImportInboxFileEndpoint>
{
    public DismissImportInboxFileSummary()
    {
        Summary = "Remove a statement from the import inbox";
        Description = "Takes a waiting statement off your list and deletes its stored copy. The import dialog calls it after "
            + "the statement is imported, and Dismiss calls it without importing. The file's fingerprint is kept for "
            + "90 days from its arrival, so the same file dropped into the inbox again in that time is ignored. Nothing "
            + "in the ledger changes.";
        Params["id"] = "The waiting statement's id.";
        Responses[204] = "The statement is no longer waiting.";
        Responses[404] = "No such statement is waiting for the signed-in user.";
    }
}
