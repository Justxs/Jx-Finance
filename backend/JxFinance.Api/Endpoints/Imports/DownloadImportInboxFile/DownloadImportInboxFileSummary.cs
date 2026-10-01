using FastEndpoints;

namespace JxFinance.Endpoints.Imports.DownloadImportInboxFile;

public sealed class DownloadImportInboxFileSummary : Summary<DownloadImportInboxFileEndpoint>
{
    public DownloadImportInboxFileSummary()
    {
        Summary = "Download a statement waiting in the import inbox";
        Description = "Answers the stored bytes of a waiting statement file exactly as the inbox received them, as an "
            + "attachment. The import dialog sends them to POST /api/import/preview to open the usual review.";
        Params["id"] = "The waiting statement's id.";
        Responses[200] = "The statement file.";
        Responses[404] = "No such statement is waiting for the signed-in user.";
    }
}
