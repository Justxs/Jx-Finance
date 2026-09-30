using ImageMagick;

namespace JxFinance.Tests.Support;

public static class SamplePhoto
{
    public static byte[] JpegAt(
        (uint Degrees, uint Minutes, uint HundredthsOfSeconds) latitude,
        string latitudeRef,
        (uint Degrees, uint Minutes, uint HundredthsOfSeconds) longitude,
        string longitudeRef)
    {
        using var photo = new MagickImage(new MagickColor("#e9e4d8"), 400, 600);
        var exif = new ExifProfile();
        exif.SetValue(ExifTag.Make, "Phone");
        exif.SetValue(ExifTag.GPSLatitudeRef, latitudeRef);
        exif.SetValue(ExifTag.GPSLatitude, Sexagesimal(latitude));
        exif.SetValue(ExifTag.GPSLongitudeRef, longitudeRef);
        exif.SetValue(ExifTag.GPSLongitude, Sexagesimal(longitude));
        photo.SetProfile(exif);
        return photo.ToByteArray(MagickFormat.Jpeg);
    }

    public static byte[] VilniusReceipt() => JpegAt((54, 41, 1300), "N", (25, 17, 2100), "E");

    private static Rational[] Sexagesimal((uint Degrees, uint Minutes, uint HundredthsOfSeconds) value) =>
        [new Rational(value.Degrees, 1), new Rational(value.Minutes, 1), new Rational(value.HundredthsOfSeconds, 100)];
}
