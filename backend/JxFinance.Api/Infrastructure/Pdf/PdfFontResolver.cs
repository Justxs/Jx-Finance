using PdfSharp.Fonts;

namespace JxFinance.Infrastructure.Pdf;

public sealed class PdfFontResolver : IFontResolver
{
    public const string FamilyName = "JxFinance Sans";
    public const string SerifFamilyName = "JxFinance Serif";

    private const string RegularFace = "JxFinanceSans#Regular";
    private const string BoldFace = "JxFinanceSans#Bold";
    private const string SerifRegularFace = "JxFinanceSerif#Regular";
    private const string SerifBoldFace = "JxFinanceSerif#Bold";

    private static readonly string WindowsFonts = Environment.GetFolderPath(Environment.SpecialFolder.Fonts);

    private static readonly Dictionary<string, string[]> Candidates = new()
    {
        [RegularFace] =
        [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
            Path.Combine(WindowsFonts, "arial.ttf"),
            "/System/Library/Fonts/Supplemental/Arial.ttf",
        ],
        [BoldFace] =
        [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            Path.Combine(WindowsFonts, "arialbd.ttf"),
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        ],
    };

    private static readonly Dictionary<string, string> EmbeddedFaces = new()
    {
        [SerifRegularFace] = "JxFinance.Pdf.SourceSerif4-Regular.ttf",
        [SerifBoldFace] = "JxFinance.Pdf.SourceSerif4-Semibold.ttf",
    };

    public static void Register()
    {
        GlobalFontSettings.FontResolver ??= new PdfFontResolver();
    }

    public FontResolverInfo? ResolveTypeface(string familyName, bool bold, bool italic) =>
        familyName == SerifFamilyName
            ? new(bold ? SerifBoldFace : SerifRegularFace)
            : new(bold ? BoldFace : RegularFace);

    public byte[]? GetFont(string faceName)
    {
        if (EmbeddedFaces.TryGetValue(faceName, out var resource))
        {
            return ReadEmbedded(resource);
        }

        var candidates = Candidates[faceName];
        var path = candidates.FirstOrDefault(File.Exists)
            ?? throw new InvalidOperationException(
                "No PDF font found. Install the fonts-dejavu-core package or provide one of: " + string.Join(", ", candidates));
        return File.ReadAllBytes(path);
    }

    private static byte[] ReadEmbedded(string resource)
    {
        using var stream = typeof(PdfFontResolver).Assembly.GetManifestResourceStream(resource)
            ?? throw new InvalidOperationException($"The embedded font {resource} is missing.");
        using var buffer = new MemoryStream();
        stream.CopyTo(buffer);
        return buffer.ToArray();
    }
}
