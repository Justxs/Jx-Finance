using ImageMagick;
using JxFinance.Common.Attachments;
using JxFinance.Common.Errors;
using JxFinance.Infrastructure.Receipts;
using PdfSharp.Pdf;
using PdfSharp.Pdf.IO;

namespace JxFinance.Tests.Unit;

public sealed class ReceiptImageTests
{
    [Fact]
    public void A_sideways_photo_comes_out_upright_without_any_exif_tag()
    {
        using var photo = new MagickImage(MagickColors.Gray, 800, 400);
        var exif = new ExifProfile();
        exif.SetValue(ExifTag.Orientation, (ushort)6);
        exif.SetValue(ExifTag.GPSLatitudeRef, "N");
        exif.SetValue(ExifTag.Make, "Phone");
        photo.SetProfile(exif);
        photo.Orientation = OrientationType.RightTop;

        var prepared = ReceiptImage.Prepare(photo.ToByteArray(MagickFormat.Jpeg), AttachmentContent.Jpeg, 2576).Value!;

        using var sent = new MagickImage(prepared.Content);
        Assert.Equal((400u, 800u), (sent.Width, sent.Height));
        Assert.Null(sent.GetExifProfile());
        Assert.Equal((AttachmentContent.Jpeg, 1, 1), (prepared.MediaType, prepared.PagesRead, prepared.PageCount));
    }

    [Theory]
    [InlineData(2576)]
    [InlineData(1568)]
    public void A_large_photo_is_shrunk_to_the_models_long_edge(int longEdge)
    {
        using var photo = new MagickImage(MagickColors.White, 3000, 4000);

        var prepared = ReceiptImage.Prepare(photo.ToByteArray(MagickFormat.Png), AttachmentContent.Png, longEdge).Value!;

        using var sent = new MagickImage(prepared.Content);
        Assert.Equal((uint)longEdge, sent.Height);
        Assert.Equal(MagickFormat.Jpeg, sent.Format);
    }

    [Fact]
    public void A_tiny_photo_is_refused()
    {
        using var photo = new MagickImage(MagickColors.White, 150, 600);

        var prepared = ReceiptImage.Prepare(photo.ToByteArray(MagickFormat.Jpeg), AttachmentContent.Jpeg, 2576);

        Assert.Equal(ErrorCodes.ReceiptUnsupportedFile, prepared.ErrorCode);
    }

    [Fact]
    public void Bytes_that_are_not_the_detected_image_are_refused() =>
        Assert.Equal(
            ErrorCodes.ReceiptUnsupportedFile,
            ReceiptImage.Prepare([0xFF, 0xD8, 0xFF, 0x00, 0x01], AttachmentContent.Jpeg, 2576).ErrorCode);

    [Fact]
    public void Heic_photos_can_be_decoded() =>
        Assert.Contains(MagickNET.SupportedFormats, format => format is { Format: MagickFormat.Heic, SupportsReading: true });

    [Fact]
    public void A_long_pdf_is_cut_to_its_first_three_pages()
    {
        var prepared = ReceiptImage.Prepare(Pdf(5), AttachmentContent.Pdf, 2576).Value!;

        using var sent = PdfReader.Open(new MemoryStream(prepared.Content), PdfDocumentOpenMode.Import);
        Assert.Equal(3, sent.PageCount);
        Assert.Equal((AttachmentContent.Pdf, 3, 5), (prepared.MediaType, prepared.PagesRead, prepared.PageCount));
    }

    [Fact]
    public void A_short_pdf_is_sent_as_it_is()
    {
        var pdf = Pdf(2);

        var prepared = ReceiptImage.Prepare(pdf, AttachmentContent.Pdf, 2576).Value!;

        Assert.Equal(pdf, prepared.Content);
        Assert.Equal((2, 2), (prepared.PagesRead, prepared.PageCount));
    }

    [Fact]
    public void A_password_protected_pdf_is_refused() =>
        Assert.Equal(ErrorCodes.ReceiptUnsupportedFile, ReceiptImage.Prepare(Pdf(1, "secret"), AttachmentContent.Pdf, 2576).ErrorCode);

    private static byte[] Pdf(int pages, string? password = null)
    {
        using var document = new PdfDocument();
        for (var page = 0; page < pages; page++)
        {
            document.AddPage();
        }

        if (password is not null)
        {
            document.SecuritySettings.UserPassword = password;
        }

        using var output = new MemoryStream();
        document.Save(output, false);
        return output.ToArray();
    }
}
