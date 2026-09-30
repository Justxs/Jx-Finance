using ImageMagick;
using JxFinance.Domain.Transactions;
using JxFinance.Infrastructure.Attachments;

namespace JxFinance.Infrastructure.Receipts;

public sealed record PhotoPosition(decimal Latitude, decimal Longitude);

public static class PhotoLocation
{
    private const decimal MinutesPerDegree = 60m;
    private const decimal SecondsPerDegree = 3600m;

    public static PhotoPosition? Read(byte[] content, string contentType)
    {
        if (!AttachmentImage.Formats.TryGetValue(contentType, out var format))
        {
            return null;
        }

        try
        {
            using var image = new MagickImage();
            image.Ping(content, new MagickReadSettings { Format = format });
            if (image.GetExifProfile() is not { } exif)
            {
                return null;
            }

            var latitude = Degrees(exif.GetValue(ExifTag.GPSLatitude)?.Value, exif.GetValue(ExifTag.GPSLatitudeRef)?.Value, "S");
            var longitude = Degrees(exif.GetValue(ExifTag.GPSLongitude)?.Value, exif.GetValue(ExifTag.GPSLongitudeRef)?.Value, "W");
            return latitude is { } lat && longitude is { } lon && TransactionPlace.IsValidPair(lat, lon)
                ? new PhotoPosition(lat, lon)
                : null;
        }
        catch (MagickException)
        {
            return null;
        }
    }

    private static decimal? Degrees(Rational[]? parts, string? reference, string negativeReference)
    {
        if (parts is not { Length: 3 } || Array.Exists(parts, part => part.Denominator == 0))
        {
            return null;
        }

        var degrees = Part(parts[0]) + (Part(parts[1]) / MinutesPerDegree) + (Part(parts[2]) / SecondsPerDegree);
        var negative = string.Equals(reference?.Trim(), negativeReference, StringComparison.OrdinalIgnoreCase);
        return TransactionPlace.Round(negative ? -degrees : degrees);
    }

    private static decimal Part(Rational part) => (decimal)part.Numerator / part.Denominator;
}
