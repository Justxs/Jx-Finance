using FastEndpoints;

namespace JxFinance.Endpoints.Receipts.ReadReceipt;

public sealed class ReadReceiptSummary : Summary<ReadReceiptEndpoint, ReadReceiptRequest>
{
    public ReadReceiptSummary()
    {
        Summary = "Read a receipt and propose its items by category";
        Description = "Sends one receipt photo or PDF to Anthropic, whose Claude model reads the items and picks one of "
            + "the caller's visible expense categories for each, and answers the reading for review. Nothing in the "
            + "ledger changes. Send multipart/form-data with exactly one of attachmentId, a file already attached to a "
            + "transaction the caller can see, or file, a new JPEG, PNG, WebP, HEIC or PDF of at most 10 MB that is "
            + "read but never stored. Photos are turned upright, stripped of their location and camera details and "
            + "shrunk before they are sent; only the first 3 pages of a PDF are sent. The request waits for the answer, "
            + "which takes 5 to 60 seconds. A reading is kept per user and file content: reading the same file again "
            + "answers the stored reading with cached true and costs nothing, unless force is true, which reads it "
            + "again and counts as another read. An item whose name the caller filed before gets the remembered "
            + "category. For an uploaded file, candidates lists up to three visible unsplit expenses with the receipt's "
            + "total, within three days of its date. Every read counts against the installation's monthly limit before "
            + "Anthropic is called. Needs the ReceiptReading feature switch, and an administrator must enable reading "
            + "and store an API key. Rate limited to 30 calls per five minutes per client.";
        Params["attachmentId"] = "An attached file to read; leave empty when sending file.";
        Params["file"] = "A new file to read, at most 10 MB; leave empty when sending attachmentId.";
        Params["force"] = "Read again even when a stored reading exists.";
        Responses[200] = "The reading.";
        Responses[400] = "Neither or both of attachmentId and file (required, value.mustBeEmpty), an attachment.* file "
            + "problem, receipt.unsupportedFile, receipt.unreadable, receipt.keyRejected, receipt.keyUnreadable, or "
            + "receipt.notConfigured.";
        Responses[404] = "The attachment is not visible to the caller, or the feature is switched off (feature.disabled).";
        Responses[409] = "This file is being read for the caller right now (conflict.busy).";
        Responses[413] = "The request body is larger than an attachment can be.";
        Responses[429] = "The installation's monthly limit of reads is reached (receipt.limitReached), or too many calls.";
        Responses[502] = "Anthropic could not be reached or failed (receipt.providerFailed).";
    }
}
