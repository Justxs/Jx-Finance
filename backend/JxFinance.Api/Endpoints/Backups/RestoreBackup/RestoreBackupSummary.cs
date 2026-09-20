using FastEndpoints;

namespace JxFinance.Endpoints.Backups.RestoreBackup;

public sealed class RestoreBackupSummary : Summary<RestoreBackupEndpoint, RestoreBackupRequest>
{
    public RestoreBackupSummary()
    {
        Summary = "Replace all data with a stored backup";
        Description = "Administrators only. Deletes everything in the installation and loads the stored "
            + "backup instead, in one database transaction: either the whole file is restored or nothing "
            + "changes. The caller confirms the action with their current password; a wrong password answers "
            + "password.incorrect and counts toward the sign-in lockout, and a locked-out account answers "
            + "credentials.lockedOut. Users, passwords, households, settings and all financial data become those of the "
            + "backup. The backups kept on the server are files, not data, so the list survives a restore. "
            + "Every sign-in session is deleted and the caller's cookies are cleared, so the client "
            + "must send the user to sign in again with a password from the backup; other signed-in users "
            + "are asked to sign in once their short-lived access token runs out. The backup must come from "
            + "the same database version as the running application; an older or newer one answers "
            + "backup.schemaMismatch. A backup that holds more data than the installation accepts answers "
            + "backup.tooLarge. Rate limited to 5 attempts per five minutes per client.";
        ExampleRequest = new RestoreBackupRequest(Guid.Empty, "correct horse battery staple");
        Params["id"] = "The backup id.";
        RequestParam(r => r.Password, "The current password of the signed-in administrator.");
        Responses[200] = "When the restored backup was taken and how many tables and rows were loaded.";
        Responses[400] = "The password is wrong, the file is damaged or too large, or the backup comes from another database version.";
        Responses[403] = "Only administrators can restore a backup.";
        Responses[404] = "No backup with this id.";
        Responses[409] = "The database was busy (lock timeout, deadlock or serialization failure). Nothing was changed; retry.";
        Responses[429] = "Too many restore attempts or too many wrong passwords; wait and retry.";
    }
}
