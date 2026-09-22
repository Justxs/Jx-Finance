using FastEndpoints;
using JxFinance.Common;
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
        Post(ApiRoutes.Transactions + "/{transactionId}/attachments");
        Group<AttachmentsGroup>();
        AllowFileUploads();
        MaxRequestBodySize(MaxRequestBytes);
        Description(d => d
            .ProducesCreated<AttachmentResponse>()
            .ProducesProblemDetails(404)
            .ProducesProblemDetails(409)
            .Produces(413));
    }

    public override async Task HandleAsync(UploadAttachmentRequest req, CancellationToken ct)
    {
        await using var stream = req.File.OpenReadStream();
        var result = await attachmentService.UploadAsync(
            req.TransactionId,
            new AttachmentUpload(stream, req.File.FileName, req.File.ContentType, req.File.Length),
            ct);
        await Send.CreatedOrProblemAsync(result, attachment => $"{ApiRoutes.AttachmentsPath}/{attachment.Id}/content", ct);
    }
}
