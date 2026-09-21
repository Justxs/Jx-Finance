using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.Attachments.Interfaces;
using JxFinance.Endpoints.Attachments.Shared;

namespace JxFinance.Endpoints.Attachments.UploadAttachment;

public sealed class UploadAttachmentEndpoint(IAttachmentService attachmentService)
    : Endpoint<UploadAttachmentRequest, AttachmentResponse>
{
    public const long MaxRequestBytes = TransactionAttachment.MaxFileBytes + (256 * 1024);

    public override void Configure()
    {
        Post("transactions/{transactionId}/attachments");
        Group<AttachmentsGroup>();
        AllowFileUploads();
        MaxRequestBodySize(MaxRequestBytes);
        Description(d => d
            .ClearDefaultProduces(200)
            .Produces<AttachmentResponse>(201, "application/json")
            .ProducesProblemDetails(404)
            .ProducesProblemDetails(409)
            .Produces(413));
    }

    public override async Task HandleAsync(UploadAttachmentRequest req, CancellationToken ct)
    {
        await using var stream = req.File.OpenReadStream();
        var attachment = (await attachmentService.UploadAsync(
            req.TransactionId,
            new AttachmentUpload(stream, req.File.FileName, req.File.ContentType, req.File.Length),
            ct)).ValueOrThrow();
        await Send.ResultAsync(TypedResults.Created($"/api/attachments/{attachment.Id}/content", attachment));
    }
}
