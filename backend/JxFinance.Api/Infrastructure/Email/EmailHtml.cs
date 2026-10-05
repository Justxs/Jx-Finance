using System.Globalization;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using JxFinance.Common.Email;

namespace JxFinance.Infrastructure.Email;

public static partial class EmailHtml
{
    public const string MarkContentId = "jx-finance-mark";
    public const string MarkFileName = "jx-finance.png";

    private const string MarkResource = "JxFinance.Email.Mark.png";
    private const string Hero = "#1f3546";
    private const string Paper = "#fbfbfc";
    private const string Page = "#f1f3f5";
    private const string Ink = "#1c2329";
    private const string Hairline = "#dfe4e8";
    private const string Link = "#253e52";

    private static readonly Lazy<byte[]> Mark = new(LoadMark);

    public static byte[] MarkImage => Mark.Value;

    public static string Render(OutgoingEmail email)
    {
        var product = Encode(ProductOf(email.Subject));
        var paragraphs = new StringBuilder();
        foreach (var paragraph in email.Body.Replace("\r\n", "\n").Split("\n\n"))
        {
            var lines = paragraph.Trim('\n').Split('\n').Select(line => Linked(Encode(line)));
            paragraphs.Append(CultureInfo.InvariantCulture, $"<p style=\"margin:0 0 16px\">{string.Join("<br>", lines)}</p>");
        }

        return $"""
            <!doctype html>
            <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>{Encode(email.Subject)}</title></head>
            <body style="margin:0;padding:0;background:{Page}">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{Page};padding:24px 12px">
            <tr><td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid {Hairline};border-radius:6px;border-collapse:separate">
            <tr><td style="background:{Hero};padding:18px 28px;border-radius:6px 6px 0 0">
            <img src="cid:{MarkContentId}" width="41" height="24" alt="" style="display:inline-block;vertical-align:middle;border:0">
            <span style="display:inline-block;vertical-align:middle;margin-left:10px;font:600 19px Georgia,'Times New Roman',serif;color:{Paper}">{product}</span>
            </td></tr>
            <tr><td style="padding:28px 28px 12px;font:15px/1.55 -apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:{Ink}">{paragraphs}</td></tr>
            </table>
            </td></tr>
            </table>
            </body></html>
            """;
    }

    private static string ProductOf(string subject)
    {
        var separator = subject.IndexOf(": ", StringComparison.Ordinal);
        return separator > 0 ? subject[..separator] : EmailTexts.DefaultProduct;
    }

    private static string Encode(string text) => WebUtility.HtmlEncode(text);

    private static string Linked(string encodedLine) =>
        UrlPattern().Replace(
            encodedLine,
            match => $"<a href=\"{match.Value}\" style=\"color:{Link};text-decoration:underline\">{match.Value}</a>");

    private static byte[] LoadMark()
    {
        using var stream = typeof(EmailHtml).Assembly.GetManifestResourceStream(MarkResource)
            ?? throw new InvalidOperationException($"The embedded resource {MarkResource} is missing.");
        using var buffer = new MemoryStream();
        stream.CopyTo(buffer);
        return buffer.ToArray();
    }

    [GeneratedRegex(@"https?://[^\s<>""]+")]
    private static partial Regex UrlPattern();
}
