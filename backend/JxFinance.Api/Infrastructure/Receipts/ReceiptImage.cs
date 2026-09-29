using ImageMagick;
using JxFinance.Common.Attachments;
using JxFinance.Common.Errors;
using JxFinance.Common.Receipts;
using JxFinance.Domain.Common;
using PdfSharp;
using PdfSharp.Pdf;
using PdfSharp.Pdf.IO;

namespace JxFinance.Infrastructure.Receipts;

public static class ReceiptImage
{
    public const int MaxPdfPages = 3;
    public const int MinShortEdge = 200;
    public const int MaxPixelEdge = 16000;

    private const int JpegQuality = 90;

    private static readonly DomainError Unsupported = new(
        ErrorCodes.ReceiptUnsupportedFile,
        "This file cannot be read as a receipt. Use a JPEG, PNG, WebP or HEIC photo or a PDF that is not password protected.");

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

    public static Result<ReceiptInput> Prepare(byte[] content, string contentType, int longEdge) =>
        contentType == AttachmentContent.Pdf ? PreparePdf(content)
        : Formats.TryGetValue(contentType, out var format) ? PrepareImage(content, format, longEdge)
        : Unsupported;

    private static Result<ReceiptInput> PrepareImage(byte[] content, MagickFormat format, int longEdge)
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

            if (Math.Max(image.Width, image.Height) > longEdge)
            {
                image.Resize(new MagickGeometry((uint)longEdge, (uint)longEdge));
            }

            image.BackgroundColor = MagickColors.White;
            image.Alpha(AlphaOption.Remove);
            image.Quality = JpegQuality;
            return new ReceiptInput(image.ToByteArray(MagickFormat.Jpeg), AttachmentContent.Jpeg, 1, 1);
        }
        catch (MagickException)
        {
            return Unsupported;
        }
    }

    private static Result<ReceiptInput> PreparePdf(byte[] content)
    {
        try
        {
            using var source = PdfReader.Open(new MemoryStream(content), PdfDocumentOpenMode.Import);
            var pageCount = source.PageCount;
            if (pageCount == 0)
            {
                return Unsupported;
            }

            if (pageCount <= MaxPdfPages)
            {
                return new ReceiptInput(content, AttachmentContent.Pdf, pageCount, pageCount);
            }

            using var kept = new PdfDocument();
            for (var page = 0; page < MaxPdfPages; page++)
            {
                kept.AddPage(source.Pages[page]);
            }

            using var output = new MemoryStream();
            kept.Save(output, false);
            return new ReceiptInput(output.ToArray(), AttachmentContent.Pdf, MaxPdfPages, pageCount);
        }
        catch (Exception ex) when (ex is PdfSharpException or InvalidOperationException or FormatException or IOException)
        {
            return Unsupported;
        }
    }
}
