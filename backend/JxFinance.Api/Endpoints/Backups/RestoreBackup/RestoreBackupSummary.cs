using FastEndpoints;

namespace JxFinance.Endpoints.Backups.RestoreBackup;

public sealed class RestoreBackupSummary : Summary<RestoreBackupEndpoint>
{
    public RestoreBackupSummary()
    {
        Summary = "Replace all data with a stored backup";
        Description = "Administrators only. Deletes everything in the installation and loads the stored "
            + "backup instead, in one database transaction: either the whole file is restored or nothing "
            + "changes. Users, passwords, households, settings and all financial data become those of the "
            + "backup. The backups kept on the server are files, not data, so the list survives a restore. "
            + "Every sign-in session is deleted and the caller's cookies are cleared, so the client "
            + "must send the user to sign in again with a password from the backup; other signed-in users "
            + "are asked to sign in once their short-lived access token runs out. The backup must come from "
            + "the same database version as the running application; an older or newer one answers "
            + "backup.schemaMismatch.";
        Responses[200] = "When the restored backup was taken and how many tables and rows were loaded.";
        Responses[400] = "The file is damaged, or the backup comes from another database version.";
        Responses[403] = "Only administrators can restore a backup.";
        Responses[404] = "No backup with this id.";
    }
}
