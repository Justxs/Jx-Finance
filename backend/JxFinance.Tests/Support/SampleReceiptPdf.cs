using JxFinance.Infrastructure.Pdf;
using PdfSharp.Drawing;
using PdfSharp.Pdf;

namespace JxFinance.Tests.Support;

public static class SampleReceiptPdf
{
    public static byte[] Of(int pages, params string[] lines) => Write(pages, null, lines);

    public static byte[] Encrypted(string password, params string[] lines) => Write(1, password, lines);

    private static byte[] Write(int pages, string? password, string[] lines)
    {
        PdfFontResolver.Register();
        using var document = new PdfDocument();
        for (var page = 0; page < pages; page++)
        {
            using var graphics = XGraphics.FromPdfPage(document.AddPage());
            var font = new XFont(PdfFontResolver.FamilyName, 10);
            for (var line = 0; line < lines.Length; line++)
            {
                var y = 40 + (line * 14);
                var price = lines[line].LastIndexOf("  ", StringComparison.Ordinal);
                if (price > 0)
                {
                    graphics.DrawString(lines[line][(price + 2)..], font, XBrushes.Black, new XPoint(220, y));
                }

                graphics.DrawString(price > 0 ? lines[line][..price] : lines[line], font, XBrushes.Black, new XPoint(20, y));
            }
        }

        if (password is not null)
        {
            document.SecuritySettings.UserPassword = password;
        }

        using var output = new MemoryStream();
        document.Save(output, false);
        return output.ToArray();
    }
}
