using System.Text;
using JxFinance.Domain.Transactions;

namespace JxFinance.Common.Attachments;

public static class AttachmentContent
{
    public const int HeaderBytes = 16;

    public const string Jpeg = "image/jpeg";
    public const string Png = "image/png";
    public const string Webp = "image/webp";
    public const string Heic = "image/heic";
    public const string Pdf = "application/pdf";

    private const string FallbackName = "attachment";

    private static readonly Dictionary<string, string[]> Extensions = new(StringComparer.Ordinal)
    {
        [Jpeg] = [".jpg", ".jpeg"],
        [Png] = [".png"],
        [Webp] = [".webp"],
        [Heic] = [".heic", ".heif"],
        [Pdf] = [".pdf"],
    };

    private static readonly Dictionary<string, string> Aliases = new(StringComparer.OrdinalIgnoreCase)
    {
        [Jpeg] = Jpeg,
        ["image/jpg"] = Jpeg,
        ["image/pjpeg"] = Jpeg,
        [Png] = Png,
        ["image/x-png"] = Png,
        [Webp] = Webp,
        [Heic] = Heic,
        ["image/heif"] = Heic,
        ["image/heic-sequence"] = Heic,
        ["image/heif-sequence"] = Heic,
        [Pdf] = Pdf,
        ["application/x-pdf"] = Pdf,
    };

    private static readonly string[] HeicBrands = ["heic", "heix", "heim", "heis", "hevc", "hevx", "mif1", "msf1", "heif"];

    public static bool IsUnspecified(string? declared) =>
        string.IsNullOrWhiteSpace(declared)
        || string.Equals(Essence(declared), "application/octet-stream", StringComparison.OrdinalIgnoreCase);

    public static string? Canonical(string? declared) =>
        declared is not null && Aliases.TryGetValue(Essence(declared), out var canonical) ? canonical : null;

    public static string? Detect(ReadOnlySpan<byte> header)
    {
        if (header.StartsWith((ReadOnlySpan<byte>)[0xFF, 0xD8, 0xFF]))
        {
            return Jpeg;
        }

        if (header.StartsWith((ReadOnlySpan<byte>)[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))
        {
            return Png;
        }

        if (header.StartsWith("%PDF-"u8))
        {
            return Pdf;
        }

        if (header.Length >= 12 && header.StartsWith("RIFF"u8) && header[8..12].SequenceEqual("WEBP"u8))
        {
            return Webp;
        }

        if (header.Length >= 12 && header[4..8].SequenceEqual("ftyp"u8)
            && HeicBrands.Contains(Encoding.ASCII.GetString(header[8..12])))
        {
            return Heic;
        }

        return null;
    }

    public static string FileName(string? original, string contentType)
    {
        var name = original ?? "";
        var slash = Math.Max(name.LastIndexOf('/'), name.LastIndexOf('\\'));
        if (slash >= 0)
        {
            name = name[(slash + 1)..];
        }

        var cleaned = new StringBuilder(name.Length);
        foreach (var character in name.Normalize(NormalizationForm.FormC))
        {
            if (char.IsControl(character) || char.IsSurrogate(character) || "<>:\"|?*;%".Contains(character))
            {
                continue;
            }

            cleaned.Append(char.IsWhiteSpace(character) ? ' ' : character);
        }

        var stem = string.Join(' ', cleaned.ToString().Split(' ', StringSplitOptions.RemoveEmptyEntries)).Trim('.', ' ');
        var extensions = Extensions[contentType];
        var extension = extensions.FirstOrDefault(e => stem.EndsWith(e, StringComparison.OrdinalIgnoreCase));
        if (extension is not null)
        {
            stem = stem[..^extension.Length].TrimEnd('.', ' ');
            extension = extension.ToLowerInvariant();
        }
        else
        {
            extension = extensions[0];
        }

        if (stem.Length == 0)
        {
            stem = FallbackName;
        }

        var room = TransactionAttachment.FileNameMaxLength - extension.Length;
        if (stem.Length > room)
        {
            stem = stem[..room].TrimEnd('.', ' ');
        }

        return stem + extension;
    }

    private static string Essence(string declared)
    {
        var separator = declared.IndexOf(';', StringComparison.Ordinal);
        return (separator >= 0 ? declared[..separator] : declared).Trim();
    }
}
