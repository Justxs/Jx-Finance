using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Attachments;
using JxFinance.Endpoints.Attachments.Interfaces;
using Microsoft.Net.Http.Headers;

namespace JxFinance.Endpoints.Attachments.DownloadAttachment;

public sealed class DownloadAttachmentEndpoint(IAttachmentService attachmentService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Get(ApiRoutes.Attachments + "/{id}/content");
        Group<AttachmentsGroup>();
        Description(d => d
            .ClearDefaultProduces(200)
            .Produces<byte[]>(
                200,
                AttachmentContent.Jpeg,
                AttachmentContent.Png,
                AttachmentContent.Webp,
                AttachmentContent.Heic,
                AttachmentContent.Pdf)
            .Produces(304)
            .ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var result = await attachmentService.OpenAsync(Route<Guid>("id"), ct);
        if (!result.TryGetValue(out var download))
        {
            await Send.ProblemAsync(result.Error, ct);
            return;
        }

        await using var content = download.Content;
        var headers = HttpContext.Response.Headers;
        var etag = new EntityTagHeaderValue($"\"{download.Sha256}\"");
        headers.CacheControl = "private, no-cache";
        headers.ETag = etag.ToString();
        headers.XContentTypeOptions = "nosniff";
        headers.ContentSecurityPolicy = "default-src 'none'; sandbox";

        if (HttpContext.Request.GetTypedHeaders().IfNoneMatch.Any(tag => tag.Compare(etag, useStrongComparison: false)))
        {
            await Send.StatusCodeAsync(StatusCodes.Status304NotModified, ct);
            return;
        }

        await Send.StreamAsync(content, download.FileName, download.SizeBytes, download.ContentType, cancellation: ct);
    }
}
