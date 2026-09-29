using ImageMagick;
using JxFinance.Common.Attachments;
using JxFinance.Common.Errors;
using JxFinance.Common.Receipts;
using JxFinance.Domain.Common;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Content;
using UglyToad.PdfPig.Core;
using UglyToad.PdfPig.Exceptions;

namespace JxFinance.Infrastructure.Receipts;

public static class ReceiptImage
{
    public const int MaxPdfPages = 3;
    public const int MinShortEdge = 200;
    public const int MaxPixelEdge = 16000;
    public const int OcrWidth = 1600;
    public const int OcrMaxHeight = 12000;

    private const int ThresholdWindow = 30;
    private const double ThresholdBias = -0.05;

    private static readonly DomainError TooSmall = new(
        ErrorCodes.ReceiptUnsupportedFile,
        $"The photo is too small to read. Use one that is at least {MinShortEdge} pixels on its short side.");

    private static readonly Dictionary<string, MagickFormat> Formats = new(StringComparer.Ordinal)
    {
        [AttachmentContent.Jpeg] = MagickFormat.Jpeg,
        [AttachmentContent.Png] = MagickFormat.Png,
        [AttachmentContent.Webp] = MagickFormat.WebP,
        [AttachmentContent.Heic] = MagickFormat.Heic,
    };

    static ReceiptImage()
    {
        ResourceLimits.Width = MaxPixelEdge;
        ResourceLimits.Height = MaxPixelEdge;
        ResourceLimits.Memory = 512UL * 1024 * 1024;
    }

    public static Result<ReceiptInput> Prepare(byte[] content, string contentType) =>
        contentType == AttachmentContent.Pdf ? ReadPdf(content)
        : Formats.TryGetValue(contentType, out var format) ? PrepareImage(content, format)
        : ReceiptErrors.Unsupported;

    private static Result<ReceiptInput> PrepareImage(byte[] content, MagickFormat format)
    {
        try
        {
            using var image = new MagickImage(content, new MagickReadSettings { Format = format });
            image.AutoOrient();
            image.Strip();
            if (Math.Min(image.Width, image.Height) < MinShortEdge)
            {
                return TooSmall;
            }

            image.BackgroundColor = MagickColors.White;
            image.Alpha(AlphaOption.Remove);
            image.Grayscale();
            image.Resize(new MagickGeometry(OcrWidth, OcrMaxHeight));
            image.AdaptiveThreshold(ThresholdWindow, ThresholdWindow, ThresholdBias * Quantum.Max);
            return new ReceiptInput(image.ToByteArray(MagickFormat.Png), null, 1, 1);
        }
        catch (MagickException)
        {
            return ReceiptErrors.Unsupported;
        }
    }

    private static Result<ReceiptInput> ReadPdf(byte[] content)
    {
        try
        {
            using var document = PdfDocument.Open(content);
            var pageCount = document.NumberOfPages;
            var pagesRead = Math.Min(pageCount, MaxPdfPages);
            var text = string.Join('\n', Enumerable.Range(1, pagesRead).Select(number => PageText(document.GetPage(number))));
            return pageCount == 0 ? ReceiptErrors.Unsupported
                : string.IsNullOrWhiteSpace(text) ? ReceiptErrors.PdfWithoutText
                : new ReceiptInput(null, text, pagesRead, pageCount);
        }
        catch (Exception ex) when (ex is PdfDocumentFormatException or PdfDocumentEncryptedException or InvalidOperationException or ArgumentException)
        {
            return ReceiptErrors.Unsupported;
        }
    }

    private static string PageText(Page page) =>
        string.Join(
            '\n',
            page.GetWords()
                .GroupBy(word => Math.Round(word.Letters[0].StartBaseLine.Y))
                .OrderByDescending(line => line.Key)
                .Select(line => string.Join(' ', line.OrderBy(word => word.BoundingBox.Left).Select(word => word.Text))));
}
