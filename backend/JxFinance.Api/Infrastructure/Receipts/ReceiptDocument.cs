using System.Text;
using JxFinance.Common.Attachments;
using MimeKit;
using MimeKit.Text;

namespace JxFinance.Infrastructure.Receipts;

public static class ReceiptDocument
{
    public const string Html = "text/html";
    public const string Email = "message/rfc822";

    private static readonly Dictionary<string, string> Extensions = new(StringComparer.OrdinalIgnoreCase)
    {
        [".html"] = Html,
        [".htm"] = Html,
        [".eml"] = Email,
    };

    private static readonly HashSet<HtmlTagId> Hidden =
    [
        HtmlTagId.Head, HtmlTagId.Title, HtmlTagId.Script, HtmlTagId.Style, HtmlTagId.NoScript, HtmlTagId.Select,
        HtmlTagId.Button, HtmlTagId.TextArea,
    ];

    private static readonly HashSet<HtmlTagId> Blocks =
    [
        HtmlTagId.Address, HtmlTagId.Article, HtmlTagId.Aside, HtmlTagId.BlockQuote, HtmlTagId.Br, HtmlTagId.Caption,
        HtmlTagId.Center, HtmlTagId.DD, HtmlTagId.Div, HtmlTagId.DL, HtmlTagId.DT, HtmlTagId.FigCaption, HtmlTagId.Footer,
        HtmlTagId.H1, HtmlTagId.H2, HtmlTagId.H3, HtmlTagId.H4, HtmlTagId.H5, HtmlTagId.H6, HtmlTagId.Header, HtmlTagId.HR,
        HtmlTagId.LI, HtmlTagId.Main, HtmlTagId.OL, HtmlTagId.P, HtmlTagId.Pre, HtmlTagId.Section, HtmlTagId.Table,
        HtmlTagId.TR, HtmlTagId.UL,
    ];

    private static readonly HashSet<HtmlTagId> Cells = [HtmlTagId.TD, HtmlTagId.TH];

    public static bool IsDocument(string contentType) => contentType is Html or Email;

    public static string? ContentTypeOf(string? declared, string? fileName, ReadOnlySpan<byte> header)
    {
        if (AttachmentContent.Detect(header) is not null)
        {
            return null;
        }

        var essence = declared?.Split(';')[0].Trim().ToLowerInvariant();
        if (essence is Html or Email)
        {
            return essence;
        }

        return AttachmentContent.IsUnspecified(declared)
            && Extensions.TryGetValue(Path.GetExtension(fileName ?? ""), out var byName)
            ? byName
            : null;
    }

    public static string? Text(byte[] content, string contentType)
    {
        if (contentType == Html)
        {
            return VisibleText(Encoding.UTF8.GetString(content));
        }

        try
        {
            using var stream = new MemoryStream(content);
            var message = MimeMessage.Load(stream);
            return message.HtmlBody is { } html ? VisibleText(html) : message.TextBody?.ReplaceLineEndings("\n");
        }
        catch (FormatException)
        {
            return null;
        }
    }

    public static string VisibleText(string html)
    {
        var text = new StringBuilder();
        var tokenizer = new HtmlTokenizer(new StringReader(html));
        HtmlTagId? hidden = null;
        var depth = 0;
        while (tokenizer.ReadNextToken(out var token))
        {
            if (token is HtmlTagToken tag)
            {
                if (hidden is { } skipped)
                {
                    depth += tag.Id != skipped || tag.IsEmptyElement ? 0 : tag.IsEndTag ? -1 : 1;
                    hidden = depth == 0 ? null : hidden;
                }
                else if (!tag.IsEndTag && !tag.IsEmptyElement && !tag.Id.IsEmptyElement() && IsHidden(tag))
                {
                    hidden = tag.Id;
                    depth = 1;
                }
                else if (Blocks.Contains(tag.Id))
                {
                    text.Append('\n');
                }
                else if (Cells.Contains(tag.Id))
                {
                    text.Append(' ');
                }
            }
            else if (hidden is null && token is HtmlDataToken { Kind: HtmlTokenKind.Data or HtmlTokenKind.CData } data)
            {
                foreach (var character in data.Data)
                {
                    text.Append(char.IsWhiteSpace(character) ? ' ' : character);
                }
            }
        }

        return string.Join(
            '\n',
            text.ToString()
                .Split('\n')
                .Select(line => string.Join(' ', line.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries)))
                .Where(line => line.Length > 0));
    }

    private static bool IsHidden(HtmlTagToken tag) =>
        Hidden.Contains(tag.Id)
        || tag.Attributes.Any(attribute =>
            string.Equals(attribute.Name, "hidden", StringComparison.OrdinalIgnoreCase)
            || (attribute.Id == HtmlAttributeId.Style
                && (attribute.Value ?? "").Replace(" ", "", StringComparison.Ordinal).Contains("display:none", StringComparison.OrdinalIgnoreCase)));
}
