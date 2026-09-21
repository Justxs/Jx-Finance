namespace JxFinance.Endpoints.Attachments.UploadAttachment;

public sealed class UploadAttachmentRequest
{
    public Guid TransactionId { get; set; }

    public IFormFile File { get; set; } = default!;
}
