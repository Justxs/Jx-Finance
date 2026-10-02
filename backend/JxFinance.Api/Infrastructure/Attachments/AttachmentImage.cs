using ImageMagick;
using JxFinance.Common.Attachments;
using JxFinance.Domain.Common;

namespace JxFinance.Infrastructure.Attachments;

public static class AttachmentImage
{
    public const int MaxPixelEdge = 16000;
    public const uint ConvertedHeicQuality = 85;

    public static readonly IReadOnlyDictionary<string, MagickFormat> Formats = new Dictionary<string, MagickFormat>(StringComparer.Ordinal)
    {
        [AttachmentContent.Jpeg] = MagickFormat.Jpeg,
        [AttachmentContent.Png] = MagickFormat.Png,
        [AttachmentContent.Webp] = MagickFormat.WebP,
        [AttachmentContent.Heic] = MagickFormat.Heic,
    };

    static AttachmentImage()
    {
        ResourceLimits.Width = MaxPixelEdge;
        ResourceLimits.Height = MaxPixelEdge;
        ResourceLimits.Memory = 512UL * 1024 * 1024;
        ResourceLimits.Area = 128UL * 1024 * 1024;
        ResourceLimits.Disk = 1024UL * 1024 * 1024;
    }

    public static Result<CleanImage> WithoutMetadata(byte[] content, string contentType)
    {
        if (!Formats.TryGetValue(contentType, out var format))
        {
            return new CleanImage(content, contentType);
        }

        try
        {
            using var image = new MagickImage(content, new MagickReadSettings { Format = format });
            image.AutoOrient();
            image.TransformColorSpace(ColorProfiles.SRGB);
            image.Strip();
            if (format != MagickFormat.Heic)
            {
                return new CleanImage(image.ToByteArray(format), contentType);
            }

            image.Quality = ConvertedHeicQuality;
            return new CleanImage(image.ToByteArray(MagickFormat.Jpeg), AttachmentContent.Jpeg);
        }
        catch (MagickException)
        {
            return AttachmentErrors.ContentMismatch;
        }
    }
}
