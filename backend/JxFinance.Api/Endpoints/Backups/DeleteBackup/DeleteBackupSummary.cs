using FastEndpoints;

namespace JxFinance.Endpoints.Backups.DeleteBackup;

public sealed class DeleteBackupSummary : Summary<DeleteBackupEndpoint>
{
    public DeleteBackupSummary()
    {
        Summary = "Delete a backup";
        Description = "Administrators only. Removes the backup file from the server for good. "
            + "The data of the installation is not touched.";
        Responses[204] = "The backup is gone.";
        Responses[403] = "Only administrators can delete a backup.";
        Responses[404] = "No backup with this id.";
    }
}
