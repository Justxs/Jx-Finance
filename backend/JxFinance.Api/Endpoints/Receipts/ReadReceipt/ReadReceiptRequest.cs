namespace JxFinance.Endpoints.Receipts.ReadReceipt;

public sealed class ReadReceiptRequest
{
    public Guid? AttachmentId { get; set; }

    public IFormFile? File { get; set; }

    public bool Force { get; set; }
}
