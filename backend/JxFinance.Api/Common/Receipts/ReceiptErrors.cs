using JxFinance.Common.Errors;
using JxFinance.Domain.Common;

namespace JxFinance.Common.Receipts;

public static class ReceiptErrors
{
    public static readonly DomainError Unreadable = new(
        ErrorCodes.ReceiptUnreadable,
        "No items or total could be read. Take a sharper, straight photo of the whole receipt in even light and try again.");

    public static readonly DomainError EngineUnavailable = new(
        ErrorCodes.ReceiptEngineUnavailable,
        "Receipt reading needs Tesseract with Lithuanian and English language data on the server, and it is not installed.");

    public static readonly DomainError Unsupported = new(
        ErrorCodes.ReceiptUnsupportedFile,
        "This file cannot be read as a receipt. Use a JPEG, PNG, WebP or HEIC photo, a PDF that is not password protected, or a receipt e-mail saved as HTML or EML.");

    public static readonly DomainError PdfWithoutText = new(
        ErrorCodes.ReceiptPdfWithoutText,
        "This PDF holds only a picture of the receipt, without text. Take a photo of the receipt or save the page as an image and read that.");
}
