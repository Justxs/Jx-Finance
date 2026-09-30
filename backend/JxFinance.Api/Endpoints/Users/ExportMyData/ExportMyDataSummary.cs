using FastEndpoints;

namespace JxFinance.Endpoints.Users.ExportMyData;

public sealed class ExportMyDataSummary : Summary<ExportMyDataEndpoint, ExportMyDataRequest>
{
    public ExportMyDataSummary()
    {
        Summary = "Download your own data";
        Description = "Streams a zip archive named jx-finance-export-<date>.zip with every record you own: data.json in the "
            + "backup's table format (format jx-finance-user-export, version 1, with your user id), and accounts.csv, "
            + "transactions.csv and transfers.csv for a spreadsheet. It holds your accounts, personal, shared and archived, "
            + "with everything recorded on them by anyone, the transfers that touch them, your categories, tags, rules, "
            + "budgets, goals, assets, debts, recurring entries, notifications, month closes and trash, and the categories, "
            + "tags and securities your records point at. It never holds passwords, two-factor secrets, passkeys, API tokens, "
            + "sessions, the broker token, the Discord webhook, households, memberships or the activity log, nor another "
            + "member's accounts. The active household is ignored. Nothing is kept on the server, and the answer carries "
            + "no Content-Length. POST /api/users/me/import loads the file into an empty member.";
        RequestParam(
            r => r.Attachments,
            "true to add the files attached to transactions on your accounts under attachments/<id>. Defaults to false.");
        Responses[200] = "The zip archive.";
        Responses[409] = "An export of your data is already being written (conflict.busy); try again when it has finished.";
        Responses[429] = "More than three exports in an hour from this client; wait and retry.";
    }
}
