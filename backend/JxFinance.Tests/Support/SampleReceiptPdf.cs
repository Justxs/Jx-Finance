using ImageMagick;
using ImageMagick.Drawing;
using JxFinance.Infrastructure.Pdf;
using PdfSharp.Drawing;
using PdfSharp.Pdf;

namespace JxFinance.Tests.Support;

public static class SampleReceiptPdf
{
    public static byte[] Of(int pages, params string[] lines) => Write(pages, null, lines);

    public static byte[] Encrypted(string password, params string[] lines) => Write(1, password, lines);

    public static byte[] Scanned(int blankPagesAfter = 0)
    {
        using var scan = new MagickImage(new MagickColor("#d8d2c0"), 600, 900);
        scan.Draw(new Drawables().FillColor(MagickColors.Black).Rectangle(60, 60, 400, 120));
        using var document = new PdfDocument();
        using (var graphics = XGraphics.FromPdfPage(document.AddPage()))
        using (var stream = new MemoryStream(scan.ToByteArray(MagickFormat.Jpeg)))
        using (var image = XImage.FromStream(stream))
        {
            graphics.DrawImage(image, 0, 0, graphics.PageSize.Width, graphics.PageSize.Height);
        }

        for (var page = 0; page < blankPagesAfter; page++)
        {
            document.AddPage();
        }

        using var output = new MemoryStream();
        document.Save(output, false);
        return output.ToArray();
    }

    public static bool CanRender(byte[] pdf)
    {
        try
        {
            using var page = new MagickImage(pdf, new MagickReadSettings { Format = MagickFormat.Pdf, FrameIndex = 0, FrameCount = 1 });
            return true;
        }
        catch (MagickException)
        {
            return false;
        }
    }

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
