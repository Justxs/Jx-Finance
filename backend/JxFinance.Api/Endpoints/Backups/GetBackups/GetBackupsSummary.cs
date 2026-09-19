using FastEndpoints;

namespace JxFinance.Endpoints.Backups.GetBackups;

public sealed class GetBackupsSummary : Summary<GetBackupsEndpoint>
{
    public GetBackupsSummary()
    {
        Summary = "List the backups kept on the server";
        Description = "Administrators only. Returns every backup in the backup directory, newest first, "
            + "with its size and row count. The first entry answers when the last backup was taken. "
            + "restorable is false for a backup taken at another database version than the running application.";
        Responses[200] = "The stored backups, newest first.";
        Responses[403] = "Only administrators can see backups.";
    }
}
