using ImageMagick;
using JxFinance.Common.Attachments;
using JxFinance.Infrastructure.Receipts;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Unit;

public sealed class PhotoLocationTests
{
    [Theory]
    [InlineData("N", "E", 54.68694, 25.28917)]
    [InlineData("S", "E", -54.68694, 25.28917)]
    [InlineData("N", "W", 54.68694, -25.28917)]
    [InlineData("S", "W", -54.68694, -25.28917)]
    public void The_references_sign_the_degrees_minutes_and_seconds(string latitudeRef, string longitudeRef, double latitude, double longitude)
    {
        var photo = SamplePhoto.JpegAt((54, 41, 1300), latitudeRef, (25, 17, 2100), longitudeRef);

        var position = PhotoLocation.Read(photo, AttachmentContent.Jpeg);

        Assert.Equal(new PhotoPosition((decimal)latitude, (decimal)longitude), position);
    }

    [Fact]
    public void A_photo_without_gps_has_no_position()
    {
        using var photo = new MagickImage(MagickColors.White, 200, 200);

        Assert.Null(PhotoLocation.Read(photo.ToByteArray(MagickFormat.Jpeg), AttachmentContent.Jpeg));
    }

    [Fact]
    public void A_pdf_has_no_position() =>
        Assert.Null(PhotoLocation.Read(SampleReceiptPdf.Of(1, "MAXIMA LT, UAB", "MOKĖTI 1,00"), AttachmentContent.Pdf));
}
