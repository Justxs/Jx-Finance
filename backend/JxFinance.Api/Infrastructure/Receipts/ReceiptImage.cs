using ImageMagick;
using JxFinance.Common.Attachments;
using JxFinance.Common.Errors;
using JxFinance.Common.Receipts;
using JxFinance.Domain.Common;
using JxFinance.Infrastructure.Attachments;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Content;
using UglyToad.PdfPig.Core;
using UglyToad.PdfPig.Exceptions;

namespace JxFinance.Infrastructure.Receipts;

public static class ReceiptImage
{
    public const int MaxPdfPages = 3;
    public const int MinShortEdge = 200;
    public const int OcrWidth = 1600;
    public const int OcrMaxHeight = AttachmentImage.MaxPixelEdge;
    public const int PdfDensity = 300;

    private const int ThresholdWindow = 30;
    private const double ThresholdBias = -0.05;

    private static readonly DomainError TooSmall = new(
        ErrorCodes.ReceiptUnsupportedFile,
        $"The photo is too small to read. Use one that is at least {MinShortEdge} pixels on its short side.");

    public static Result<ReceiptInput> Prepare(byte[] content, string contentType) =>
        AttachmentImage.Formats.TryGetValue(contentType, out var format) ? PrepareImage(content, format)
        : contentType == AttachmentContent.Pdf ? ReadPdf(content)
        : ReceiptDocument.IsDocument(contentType) ? ReadDocument(content, contentType)
        : ReceiptErrors.Unsupported;

    private static Result<ReceiptInput> ReadDocument(byte[] content, string contentType) =>
        ReceiptDocument.Text(content, contentType) switch
        {
            null => ReceiptErrors.Unsupported,
            var text when string.IsNullOrWhiteSpace(text) => ReceiptErrors.Unreadable,
            var text => new ReceiptInput([], text, 1, 1),
        };

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

            PrepareForOcr(image);
            return new ReceiptInput([ReceiptBands.Cut(image)], null, 1, 1);
        }
        catch (MagickException)
        {
            return ReceiptErrors.Unsupported;
        }
    }

    private static void PrepareForOcr(MagickImage image)
    {
        image.BackgroundColor = MagickColors.White;
        image.Alpha(AlphaOption.Remove);
        image.Grayscale();
        image.Resize(new MagickGeometry(OcrWidth, OcrMaxHeight));
        image.AdaptiveThreshold(ThresholdWindow, ThresholdWindow, ThresholdBias * Quantum.Max);
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
                : string.IsNullOrWhiteSpace(text) ? RenderPdf(content, pagesRead, pageCount)
                : new ReceiptInput([], text, pagesRead, pageCount);
        }
        catch (Exception ex) when (ex is PdfDocumentFormatException or PdfDocumentEncryptedException or InvalidOperationException or ArgumentException)
        {
            return ReceiptErrors.Unsupported;
        }
    }

    private static Result<ReceiptInput> RenderPdf(byte[] content, int pagesRead, int pageCount)
    {
        try
        {
            var pages = new List<IReadOnlyList<byte[]>>();
            for (var index = 0; index < pagesRead; index++)
            {
                var settings = new MagickReadSettings
                {
                    Format = MagickFormat.Pdf,
                    Density = new Density(PdfDensity),
                    FrameIndex = (uint)index,
                    FrameCount = 1,
                };
                using var page = new MagickImage(content, settings);
                PrepareForOcr(page);
                if (page.TotalColors > 1)
                {
                    pages.Add(ReceiptBands.Cut(page));
                }
            }

            return pages.Count > 0 ? new ReceiptInput(pages, null, pagesRead, pageCount) : ReceiptErrors.PdfWithoutText;
        }
        catch (MagickException)
        {
            return ReceiptErrors.PdfWithoutText;
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
