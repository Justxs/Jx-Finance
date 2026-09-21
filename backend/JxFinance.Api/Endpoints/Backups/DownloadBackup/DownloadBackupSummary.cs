using FastEndpoints;

namespace JxFinance.Endpoints.Backups.DownloadBackup;

public sealed class DownloadBackupSummary : Summary<DownloadBackupEndpoint>
{
    public DownloadBackupSummary()
    {
        Summary = "Download a backup file";
        Description = "Administrators only. Streams the stored file, named after the moment the backup was "
            + "taken. Keep a copy away from the server: a backup that lives only next to the database is lost "
            + "together with it. The file holds password hashes; treat it as a secret.";
        Responses[200] = "A zip archive holding backup.json and the attached files under attachments/, or, for a backup taken before attachments existed, the gzip-compressed JSON on its own.";
        Responses[403] = "Only administrators can download a backup.";
        Responses[404] = "No backup with this id.";
    }
}
