using FastEndpoints;

namespace JxFinance.Endpoints.Backups.UpdateBackup;

public sealed class UpdateBackupSummary : Summary<UpdateBackupEndpoint, UpdateBackupRequest>
{
    public UpdateBackupSummary()
    {
        Summary = "Change the note of a backup";
        Description = "Administrators only. The note is the only part of a stored backup that can change; "
            + "the file itself is never rewritten.";
        RequestParam(r => r.Note, "The new note, at most 200 characters. Null or blank removes it.");
        Responses[200] = "The backup with its new note.";
        Responses[403] = "Only administrators can change a backup.";
        Responses[404] = "No backup with this id.";
    }
}
