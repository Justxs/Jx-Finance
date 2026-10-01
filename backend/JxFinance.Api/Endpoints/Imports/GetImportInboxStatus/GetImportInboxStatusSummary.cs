using FastEndpoints;

namespace JxFinance.Endpoints.Imports.GetImportInboxStatus;

public sealed class GetImportInboxStatusSummary : Summary<GetImportInboxStatusEndpoint>
{
    public GetImportInboxStatusSummary()
    {
        Summary = "Read the import inbox of this installation";
        Description = "Answers the folder the API watches for statement files (App:ImportInbox, null when the inbox is "
            + "off) and the latest 20 files it could not use, newest first, each with the reason written beside it in the "
            + "failed folder. Administrators only.";
        Responses[200] = "The inbox folder and its recent failures.";
        Responses[403] = "Only administrators can read the import inbox.";
    }
}
