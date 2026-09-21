using FastEndpoints;

namespace JxFinance.Endpoints.Attachments.DeleteAttachment;

public sealed class DeleteAttachmentSummary : Summary<DeleteAttachmentEndpoint>
{
    public DeleteAttachmentSummary()
    {
        Summary = "Remove a file from a transaction";
        Description = "Moves the file to the trash: it disappears from the transaction but stays on disk, "
            + "and POST /api/trash/restore with kind attachment puts it back for the next 30 days. After "
            + "that a background job removes the file for good. Anyone who can see the transaction can "
            + "remove its files; on a shared account the household's activity log records it.";
        Params["id"] = "The attachment id.";
        Responses[204] = "The file is in the trash.";
        Responses[404] = "No such attachment is visible to the signed-in user.";
    }
}
