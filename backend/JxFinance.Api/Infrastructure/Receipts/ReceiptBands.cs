using ImageMagick;

namespace JxFinance.Infrastructure.Receipts;

public static class ReceiptBands
{
    public const int SplitAbove = 4000;
    public const int BandHeight = 2000;
    public const int Overlap = 150;
    public const int SeamLines = 6;

    public static List<byte[]> Cut(MagickImage image)
    {
        if (image.Height <= SplitAbove)
        {
            return [image.ToByteArray(MagickFormat.Png)];
        }

        var bands = new List<byte[]>();
        for (var top = 0; top < image.Height - Overlap; top += BandHeight - Overlap)
        {
            using var band = image.CloneArea(0, top, image.Width, (uint)Math.Min(BandHeight, image.Height - top));
            band.ResetPage();
            bands.Add(band.ToByteArray(MagickFormat.Png));
        }

        return bands;
    }

    public static string Join(IEnumerable<string> texts)
    {
        var lines = new List<string>();
        foreach (var text in texts)
        {
            var next = Lines(text);
            var (kept, repeated) = Seam(lines, next);
            lines.RemoveRange(kept, lines.Count - kept);
            lines.AddRange(next.Skip(repeated));
        }

        return string.Join('\n', lines);
    }

    private static (int Kept, int Repeated) Seam(List<string> previous, List<string> next)
    {
        var tail = Math.Min(SeamLines, previous.Count);
        for (var index = Math.Min(SeamLines, next.Count) - 1; index >= 0; index--)
        {
            var line = next[index];
            var match = previous.FindLastIndex(previous.Count - 1, tail, earlier => Same(earlier, line));
            if (match >= 0)
            {
                return (match + 1, index + 1);
            }
        }

        return (previous.Count, 0);
    }

    private static List<string> Lines(string text) =>
    [
        .. text.Split('\n')
            .Select(line => string.Join(' ', line.Split((char[])[' ', '\t', '\r'], StringSplitOptions.RemoveEmptyEntries)))
            .Where(line => line.Length > 0),
    ];

    private static bool Same(string earlier, string later) =>
        earlier.Length >= 4 && string.Equals(earlier, later, StringComparison.OrdinalIgnoreCase);
}
