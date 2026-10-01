using ImageMagick;
using ImageMagick.Drawing;
using JxFinance.Common.Attachments;
using JxFinance.Common.Errors;
using JxFinance.Infrastructure.Receipts;
using JxFinance.Tests.Support;

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

        var prepared = ReceiptImage.Prepare(photo.ToByteArray(MagickFormat.Jpeg), AttachmentContent.Jpeg).Value!;

        using var read = new MagickImage(Assert.Single(prepared.Bands));
        Assert.True(read.Height > read.Width);
        Assert.Null(read.GetExifProfile());
        Assert.Equal((null, 1, 1), (prepared.Text, prepared.PagesRead, prepared.PageCount));
    }

    [Theory]
    [InlineData(400, 900)]
    [InlineData(3000, 4000)]
    public void A_photo_is_scaled_to_the_width_tesseract_reads_best_and_turned_black_and_white(int width, int height)
    {
        using var photo = new MagickImage(new MagickColor("#d8d2c0"), (uint)width, (uint)height);
        photo.Draw(new Drawables().FillColor(MagickColors.Black).Rectangle(20, 20, 120, 60));

        var prepared = ReceiptImage.Prepare(photo.ToByteArray(MagickFormat.Png), AttachmentContent.Png).Value!;

        using var read = new MagickImage(Assert.Single(prepared.Bands));
        Assert.Equal((uint)ReceiptImage.OcrWidth, read.Width);
        Assert.Equal(MagickFormat.Png, read.Format);
        Assert.True(read.TotalColors <= 2);
    }

    [Fact]
    public void A_tiny_photo_is_refused()
    {
        using var photo = new MagickImage(MagickColors.White, 150, 600);

        var prepared = ReceiptImage.Prepare(photo.ToByteArray(MagickFormat.Jpeg), AttachmentContent.Jpeg);

        Assert.Equal(ErrorCodes.ReceiptUnsupportedFile, prepared.ErrorCode);
    }

    [Fact]
    public void Bytes_that_are_not_the_detected_image_are_refused() =>
        Assert.Equal(
            ErrorCodes.ReceiptUnsupportedFile,
            ReceiptImage.Prepare([0xFF, 0xD8, 0xFF, 0x00, 0x01], AttachmentContent.Jpeg).ErrorCode);

    [Fact]
    public void Heic_photos_can_be_decoded() =>
        Assert.Contains(MagickNET.SupportedFormats, format => format is { Format: MagickFormat.Heic, SupportsReading: true });

    [Fact]
    public void A_pdf_is_read_from_its_text_line_by_line_on_its_first_three_pages()
    {
        var prepared = ReceiptImage.Prepare(SampleReceiptPdf.Of(5, "Duona 800 g  1,89 A", "Pienas 1 l  1,19 A"), AttachmentContent.Pdf).Value!;

        Assert.Empty(prepared.Bands);
        Assert.Equal((3, 5), (prepared.PagesRead, prepared.PageCount));
        var lines = prepared.Text!.Split('\n');
        Assert.Equal(6, lines.Length);
        Assert.Equal(["Duona 800 g 1,89 A", "Pienas 1 l 1,19 A"], lines[..2]);
    }

    [Fact]
    public void A_pdf_without_text_is_refused_with_its_own_code() =>
        Assert.Equal(ErrorCodes.ReceiptPdfWithoutText, ReceiptImage.Prepare(SampleReceiptPdf.Of(1), AttachmentContent.Pdf).ErrorCode);

    [Fact]
    public void A_password_protected_pdf_is_refused() =>
        Assert.Equal(ErrorCodes.ReceiptUnsupportedFile, ReceiptImage.Prepare(SampleReceiptPdf.Encrypted("secret", "Duona  1,89 A"), AttachmentContent.Pdf).ErrorCode);
}
