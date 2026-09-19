using FastEndpoints;

namespace JxFinance.Endpoints.Backups.CreateBackup;

public sealed class CreateBackupSummary : Summary<CreateBackupEndpoint, CreateBackupRequest>
{
    public CreateBackupSummary()
    {
        Summary = "Take a backup of the whole installation";
        Description = "Administrators only. Writes every table of the installation into one gzip-compressed "
            + "JSON file in the backup directory of the server: users with their password hashes, households, "
            + "settings, exchange rates and all financial data of every user. Sign-in sessions are left out. "
            + "The file is read from one database snapshot, so it is consistent even while others keep working. "
            + "Broker tokens inside it stay encrypted with the key directory of this installation and have to "
            + "be entered again on any other one.";
        RequestParam(r => r.Note, "Optional reminder of why the backup was taken, at most 200 characters.");
        Responses[201] = "The stored backup.";
        Responses[403] = "Only administrators can take a backup.";
    }
}
