using FastEndpoints;

namespace JxFinance.Endpoints.Imports.ListImportInbox;

public sealed class ListImportInboxSummary : Summary<ListImportInboxEndpoint>
{
    public ListImportInboxSummary()
    {
        Summary = "List statements waiting in the import inbox";
        Description = "Returns the statement files the import inbox received for accounts you own and that you have not "
            + "imported or dismissed yet, newest first. Each names the account, the format and, for a CSV file, the saved "
            + "mapping the inbox chose. A file whose account is no longer visible to you is left out. Nothing is imported "
            + "until you review it: fetch the file and send it through POST /api/import/preview and confirm as usual.";
        Responses[200] = "The waiting statements of the signed-in user, newest first.";
    }
}
