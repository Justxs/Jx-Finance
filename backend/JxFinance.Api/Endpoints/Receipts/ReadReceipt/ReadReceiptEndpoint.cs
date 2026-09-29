using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Attachments.Shared;
using JxFinance.Endpoints.Attachments.UploadAttachment;
using JxFinance.Endpoints.Receipts.Interfaces;
using JxFinance.Endpoints.Receipts.Shared;

namespace JxFinance.Endpoints.Receipts.ReadReceipt;

public sealed class ReadReceiptEndpoint(IReceiptService receiptService)
    : Endpoint<ReadReceiptRequest, ReceiptReadingResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Receipts + "/read");
        Group<ReceiptsGroup>();
        AllowFileUploads();
        MaxRequestBodySize(UploadAttachmentEndpoint.MaxRequestBytes);
        Throttle(hitLimit: 30, durationSeconds: 300);
        Description(d => d
            .ProducesProblemDetails(404)
            .ProducesProblemDetails(409)
            .Produces(413)
            .Produces(429)
            .ProducesProblemDetails(503));
    }

    public override async Task HandleAsync(ReadReceiptRequest req, CancellationToken ct)
    {
        await using var stream = req.File?.OpenReadStream();
        var upload = req.File is { } file && stream is not null
            ? new AttachmentUpload(stream, file.FileName, file.ContentType, file.Length)
            : null;
        await Send.OkOrProblemAsync(
            await receiptService.ReadAsync(new ReceiptSource(req.AttachmentId, upload, req.Force), ct),
            ct);
    }
}
