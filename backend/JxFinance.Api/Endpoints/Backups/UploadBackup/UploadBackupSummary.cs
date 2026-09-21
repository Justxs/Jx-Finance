using FastEndpoints;

namespace JxFinance.Endpoints.Backups.UploadBackup;

public sealed class UploadBackupSummary : Summary<UploadBackupEndpoint, UploadBackupRequest>
{
    public UploadBackupSummary()
    {
        Summary = "Add a downloaded backup to the server";
        Description = "Administrators only. Stores a backup file that was downloaded earlier, from this or "
            + "another installation, so it appears in the list and can be restored. Nothing is restored by "
            + "this call. The listed date is the moment the backup was taken, not the upload. Send the file "
            + "as multipart/form-data.";
        Params["file"] = "A backup file: a zip archive as downloaded, or a gzip-compressed or plain JSON backup from before attachments existed, at most 2 GB.";
        Params["note"] = "Optional reminder, at most 200 characters.";
        Responses[201] = "The stored backup.";
        Responses[400] = "No file, a file over 2 GB, a file that is not a backup, or one that holds more data once decompressed than the installation accepts (backup.tooLarge).";
        Responses[403] = "Only administrators can upload a backup.";
        Responses[429] = "More than 10 uploads in five minutes; wait and retry.";
    }
}
