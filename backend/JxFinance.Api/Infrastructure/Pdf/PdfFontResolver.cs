using PdfSharp.Fonts;

namespace JxFinance.Infrastructure.Pdf;

public sealed class PdfFontResolver : IFontResolver
{
    public const string FamilyName = "JxFinance Sans";

    private const string RegularFace = "JxFinanceSans#Regular";
    private const string BoldFace = "JxFinanceSans#Bold";

    private static readonly string WindowsFonts = Environment.GetFolderPath(Environment.SpecialFolder.Fonts);

    private static readonly string[] RegularCandidates =
    [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        Path.Combine(WindowsFonts, "arial.ttf"),
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    ];

    private static readonly string[] BoldCandidates =
    [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        Path.Combine(WindowsFonts, "arialbd.ttf"),
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    ];

    public static void Register()
    {
        GlobalFontSettings.FontResolver ??= new PdfFontResolver();
    }

    public FontResolverInfo? ResolveTypeface(string familyName, bool bold, bool italic) =>
        new(bold ? BoldFace : RegularFace);

    public byte[]? GetFont(string faceName)
    {
        var candidates = faceName == BoldFace ? BoldCandidates : RegularCandidates;
        var path = candidates.FirstOrDefault(File.Exists)
            ?? throw new InvalidOperationException(
                "No PDF font found. Install the fonts-dejavu-core package or provide one of: " + string.Join(", ", candidates));
        return File.ReadAllBytes(path);
    }
}
