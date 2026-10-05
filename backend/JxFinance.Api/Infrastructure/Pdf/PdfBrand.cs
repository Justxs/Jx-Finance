namespace JxFinance.Infrastructure.Pdf;

public static class PdfBrand
{
    private const string MarkResource = "JxFinance.Pdf.BrandMark.png";

    private static readonly Lazy<string> Mark = new(LoadMark);

    public static string MarkImage => Mark.Value;

    private static string LoadMark()
    {
        using var stream = typeof(PdfBrand).Assembly.GetManifestResourceStream(MarkResource)
            ?? throw new InvalidOperationException($"The embedded resource {MarkResource} is missing.");
        using var buffer = new MemoryStream();
        stream.CopyTo(buffer);
        return "base64:" + Convert.ToBase64String(buffer.ToArray());
    }
}
