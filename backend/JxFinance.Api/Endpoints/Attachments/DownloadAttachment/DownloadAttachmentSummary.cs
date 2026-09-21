using FastEndpoints;

namespace JxFinance.Endpoints.Attachments.DownloadAttachment;

public sealed class DownloadAttachmentSummary : Summary<DownloadAttachmentEndpoint>
{
    public DownloadAttachmentSummary()
    {
        Summary = "Download a file of a transaction";
        Description = "Streams the stored file with the content type detected at upload, always as an "
            + "attachment (Content-Disposition: attachment) with X-Content-Type-Options: nosniff and a "
            + "sandboxing Content-Security-Policy, so a browser never renders it as a page. An image "
            + "element may still show an image from this address, which is how thumbnails are drawn. "
            + "The ETag is the file's SHA-256; send it back in If-None-Match to get 304 instead of the "
            + "bytes.";
        Params["id"] = "The attachment id.";
        Responses[200] = "The file.";
        Responses[304] = "The copy you hold is current.";
        Responses[404] = "No such attachment is visible to the signed-in user, or its file is no longer stored.";
    }
}
