using FastEndpoints;

namespace JxFinance.Endpoints.Users.ImportMyData;

public sealed class ImportMyDataSummary : Summary<ImportMyDataEndpoint, ImportMyDataRequest>
{
    public ImportMyDataSummary()
    {
        Summary = "Import a download of your data";
        Description = "Loads the zip that GET /api/users/me/export wrote, from this or another installation, into the "
            + "signed-in member, in one database transaction: either everything is imported or nothing changes. The member "
            + "must have no accounts or tags yet (import.targetNotEmpty); the starter categories nothing uses are moved to "
            + "the trash. Every record becomes the member's own and personal: household sharing, households, notifications, "
            + "shared expenses, settlements, month closes, the trash, the broker connection and preferences are not imported. "
            + "A security that already exists with the same id is reused, records that point at something the file does not "
            + "hold are dropped or unlinked, and attached files are written back after their SHA-256 has been checked; an "
            + "attachment without its file is dropped. An export taken on this version or an older one is accepted: columns "
            + "added since get their defaults or the values the startup backfills give, and tables added since stay empty. "
            + "One taken on a newer version answers import.newerVersion, and one whose database version this application "
            + "does not know answers import.unknownVersion. Importing records that already exist here, such as the same "
            + "file twice, answers import.alreadyPresent. Rate limited to 5 imports an hour per client.";
        Responses[200] = "How many tables, rows and files were imported, and how many records were dropped because they pointed at data outside the file.";
        Responses[400] = "The file is not a data export, is damaged or too large, comes from a newer or unknown database version, or the member already has data.";
        Responses[409] = "The records already exist here (import.alreadyPresent), or the database was busy (conflict.busy); nothing was changed.";
        Responses[429] = "More than five imports in an hour from this client; wait and retry.";
    }
}
