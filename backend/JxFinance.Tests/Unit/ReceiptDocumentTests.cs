using System.Text;
using JxFinance.Common.Attachments;
using JxFinance.Common.Errors;
using JxFinance.Infrastructure.Receipts;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Unit;

public sealed class ReceiptDocumentTests
{
    [Fact]
    public void A_table_row_becomes_one_line_with_its_cells_joined_by_a_space()
    {
        var text = ReceiptDocument.VisibleText("""
            <table>
              <tr><th>Prekė</th><th>Suma</th></tr>
              <tr><td>Pienas   1 l</td><td>1,19&nbsp;&euro;</td></tr>
              <tr><td>Duona</td><td>1,89 €</td></tr>
            </table>
            <p>Iš viso<br>3,08 €</p>
            """);

        Assert.Equal(["Prekė Suma", "Pienas 1 l 1,19 €", "Duona 1,89 €", "Iš viso", "3,08 €"], text.Split('\n'));
    }

    [Fact]
    public void Hidden_preheaders_head_scripts_styles_and_form_controls_are_left_out()
    {
        var text = ReceiptDocument.VisibleText("""
            <html><head><title>Kvitas</title><style>p { color: red }</style></head>
            <body>
              <div style="display: none; max-height: 0">Ačiū, kad apsipirkote!</div>
              <span hidden>preview <b>bold</b> text</span>
              <script>var total = "9,99";</script>
              <noscript>Enable scripts</noscript>
              <select><option>LT</option></select><button>Pirkti</button><textarea>note</textarea>
              <div><div>Pienas 1,19</div></div>
              <img src="https://tracker.invalid/pixel.gif">
            </body></html>
            """);

        Assert.Equal("Pienas 1,19", text);
    }

    [Fact]
    public void Entities_are_decoded()
    {
        Assert.Equal("Tom & Jerry <2> 1,19 €", ReceiptDocument.VisibleText("<p>Tom &amp; Jerry &lt;2&gt; 1,19&#160;&#8364;</p>"));
    }

    [Fact]
    public void An_html_file_is_read_as_utf8()
    {
        var text = ReceiptDocument.Text(Encoding.UTF8.GetBytes("<p>Mokėti 3,08</p>"), ReceiptDocument.Html);

        Assert.Equal("Mokėti 3,08", text);
    }

    [Fact]
    public void A_message_gives_its_html_part()
    {
        var message = Message(
            """
            Content-Type: multipart/alternative; boundary="b"

            --b
            Content-Type: text/plain; charset=utf-8

            Plain total 1,00
            --b
            Content-Type: text/html; charset=utf-8

            <table><tr><td>Pienas</td><td>1,19</td></tr></table>
            --b--
            """);

        Assert.Equal("Pienas 1,19", ReceiptDocument.Text(message, ReceiptDocument.Email));
    }

    [Fact]
    public void A_message_without_html_gives_its_text_part()
    {
        var message = Message(
            """
            Content-Type: text/plain; charset=utf-8

            Pienas 1,19
            Mokėti 1,19
            """);

        Assert.Equal("Pienas 1,19\nMokėti 1,19", ReceiptDocument.Text(message, ReceiptDocument.Email)!.Trim());
    }

    [Fact]
    public void A_message_that_cannot_be_parsed_gives_no_text() =>
        Assert.Null(ReceiptDocument.Text([], ReceiptDocument.Email));

    [Fact]
    public void A_document_without_visible_text_is_unreadable_and_an_unparseable_one_unsupported()
    {
        Assert.Equal(ErrorCodes.ReceiptUnreadable, ReceiptImage.Prepare(Encoding.UTF8.GetBytes("<script>1</script>"), ReceiptDocument.Html).ErrorCode);
        Assert.Equal(ErrorCodes.ReceiptUnsupportedFile, ReceiptImage.Prepare([], ReceiptDocument.Email).ErrorCode);
    }

    [Fact]
    public void A_document_is_prepared_as_text_without_pages()
    {
        var prepared = ReceiptImage.Prepare(Encoding.UTF8.GetBytes("<p>Pienas 1,19</p>"), ReceiptDocument.Html).Value!;

        Assert.Equal(("Pienas 1,19", 1, 1), (prepared.Text, prepared.PagesRead, prepared.PageCount));
        Assert.Empty(prepared.Pages);
    }

    [Theory]
    [InlineData("text/html", "receipt.bin", ReceiptDocument.Html)]
    [InlineData("TEXT/HTML; charset=utf-8", null, ReceiptDocument.Html)]
    [InlineData("message/rfc822", "mail", ReceiptDocument.Email)]
    [InlineData(null, "receipt.HTM", ReceiptDocument.Html)]
    [InlineData("", "receipt.html", ReceiptDocument.Html)]
    [InlineData("application/octet-stream", "order.eml", ReceiptDocument.Email)]
    [InlineData("text/plain", "receipt.html", null)]
    [InlineData(null, "receipt.txt", null)]
    [InlineData(null, null, null)]
    public void A_document_is_known_by_its_declared_type_or_else_its_extension(string? declared, string? fileName, string? expected) =>
        Assert.Equal(expected, ReceiptDocument.ContentTypeOf(declared, fileName, Encoding.UTF8.GetBytes("<html><body>")));

    [Fact]
    public void A_file_whose_first_bytes_are_an_image_or_a_pdf_is_never_a_document()
    {
        Assert.Null(ReceiptDocument.ContentTypeOf("text/html", "receipt.html", SamplePhoto.Png(10).AsSpan(0, AttachmentContent.HeaderBytes)));
        Assert.Null(ReceiptDocument.ContentTypeOf("message/rfc822", "receipt.eml", SampleReceiptPdf.Of(1).AsSpan(0, AttachmentContent.HeaderBytes)));
    }

    private static byte[] Message(string body) =>
        Encoding.UTF8.GetBytes("From: shop@example.invalid\r\nTo: me@example.invalid\r\nSubject: Kvitas\r\nMIME-Version: 1.0\r\n" + body.ReplaceLineEndings("\r\n"));
}
