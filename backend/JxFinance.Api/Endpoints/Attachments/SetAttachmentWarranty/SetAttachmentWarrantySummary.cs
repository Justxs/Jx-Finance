using FastEndpoints;

namespace JxFinance.Endpoints.Attachments.SetAttachmentWarranty;

public sealed class SetAttachmentWarrantySummary : Summary<SetAttachmentWarrantyEndpoint, SetAttachmentWarrantyRequest>
{
    public SetAttachmentWarrantySummary()
    {
        Summary = "Set the warranty end of a receipt";
        Description = "Records until when the purchase on this attached receipt is under warranty, or clears it with null. "
            + "The member who attached the file is reminded 30 days before that date, once per date.";
        Params["id"] = "The attachment id.";
        RequestParam(r => r.WarrantyUntil, "The last day of the warranty as YYYY-MM-DD, or null to clear it.");
        Responses[200] = "The attachment with its warranty date.";
        Responses[404] = "No such attachment is visible to the signed-in user.";
    }
}
