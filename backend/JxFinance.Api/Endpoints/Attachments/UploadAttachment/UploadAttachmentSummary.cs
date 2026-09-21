using FastEndpoints;

namespace JxFinance.Endpoints.Attachments.UploadAttachment;

public sealed class UploadAttachmentSummary : Summary<UploadAttachmentEndpoint, UploadAttachmentRequest>
{
    public UploadAttachmentSummary()
    {
        Summary = "Attach a file to a transaction";
        Description = "Stores one receipt or document with the transaction. Send it as multipart/form-data "
            + "in the field file. JPEG, PNG, WebP and HEIC images and PDF documents are accepted, at most "
            + "10 MB each and 10 per transaction. The type is read from the file's first bytes, not "
            + "trusted from the upload: a declared type that disagrees with the content is refused. The "
            + "file is kept under a generated id; the name you sent is only shown back, with path parts, "
            + "control characters and reserved characters removed and an extension that matches the "
            + "content. On a shared account the household's activity log records the upload.";
        Params["transactionId"] = "The transaction id.";
        Params["file"] = "The file, at most 10 MB.";
        Responses[201] = "The stored file.";
        Responses[400] = "No file (required), an empty file (attachment.empty), a file over 10 MB "
            + "(attachment.tooLarge), a type that is not accepted (attachment.typeNotAllowed), or content "
            + "that does not match the declared type (attachment.contentMismatch).";
        Responses[404] = "No such transaction is visible to the signed-in user.";
        Responses[409] = "The transaction already has 10 files (attachment.limitReached).";
        Responses[413] = "The request body is larger than an attachment can be.";
    }
}
