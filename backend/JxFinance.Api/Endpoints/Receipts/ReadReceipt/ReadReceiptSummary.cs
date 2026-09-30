using FastEndpoints;

namespace JxFinance.Endpoints.Receipts.ReadReceipt;

public sealed class ReadReceiptSummary : Summary<ReadReceiptEndpoint, ReadReceiptRequest>
{
    public ReadReceiptSummary()
    {
        Summary = "Read a receipt and propose its items by category";
        Description = "Reads one receipt photo or PDF on this server and answers its merchant, date, total and items "
            + "for review; nothing leaves the installation and nothing in the ledger changes. Send multipart/form-data "
            + "with exactly one of attachmentId, a file already attached to a transaction the caller can see, or file, "
            + "a new JPEG, PNG, WebP, HEIC or PDF of at most 10 MB that is read but never stored. Photos are turned "
            + "upright, stripped of their metadata and read with Tesseract (Lithuanian and English); a PDF is read from "
            + "the text of its first 3 pages, and a PDF without text answers receipt.pdfWithoutText. Lines that look "
            + "like part of the receipt but cannot be read as an item come back in unreadLines. Each item gets the "
            + "category the caller chose for that name before (remembered), otherwise the category of the caller's "
            + "first matching categorization rule, otherwise none. A reading is kept per user and file content: "
            + "reading the same file again answers the stored reading with cached true, unless force is true. For an "
            + "uploaded file, candidates lists up to three visible unsplit expenses with the receipt's total, within "
            + "three days of its date. result.address is the shop's address line from the receipt's header, when one "
            + "has a street number and a postcode or a known city. While the locations feature is on, an uploaded photo "
            + "whose EXIF carries a GPS position answers it as photoLatitude and photoLongitude, read before the metadata "
            + "is stripped and never stored with the reading; a PDF or an attached file answers null. "
            + "Needs the ReceiptReading feature switch. Rate limited to 30 calls per five "
            + "minutes per client.";
        Params["attachmentId"] = "An attached file to read; leave empty when sending file.";
        Params["file"] = "A new file to read, at most 10 MB; leave empty when sending attachmentId.";
        Params["force"] = "Read again even when a stored reading exists.";
        Responses[200] = "The reading.";
        Responses[400] = "Neither or both of attachmentId and file (required, value.mustBeEmpty), an attachment.* file "
            + "problem, receipt.unsupportedFile, receipt.pdfWithoutText, or receipt.unreadable when no item and no total "
            + "could be read or reading took longer than a minute.";
        Responses[404] = "The attachment is not visible to the caller, or the feature is switched off (feature.disabled).";
        Responses[409] = "This file is being read for the caller right now (conflict.busy).";
        Responses[413] = "The request body is larger than an attachment can be.";
        Responses[429] = "Too many calls from this client; wait and retry.";
        Responses[503] = "Tesseract or its Lithuanian and English language data is not installed on the server (receipt.engineUnavailable).";
    }
}
