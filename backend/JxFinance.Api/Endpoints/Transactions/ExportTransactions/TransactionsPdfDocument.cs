using System.Globalization;
using JxFinance.Common.Formats;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Transactions.Shared;
using JxFinance.Infrastructure.Pdf;
using MigraDoc.DocumentObjectModel;
using MigraDoc.Rendering;

namespace JxFinance.Endpoints.Transactions.ExportTransactions;

public sealed class TransactionsPdfDocument(
    IReadOnlyList<TransactionResponse> transactions,
    ExportNames names,
    DateOnly? dateFrom,
    DateOnly? dateTo,
    Currency reportingCurrency)
{
    private const double PageMargin = 30;
    private const double DateColumnWidth = 70;
    private const double TypeColumnWidth = 60;
    private const double AmountColumnWidth = 80;

    private static readonly Color IncomeColor = new(0x38, 0x8E, 0x3C);
    private static readonly Color ExpenseColor = new(0xD3, 0x2F, 0x2F);
    private static readonly Color MutedColor = new(0x75, 0x75, 0x75);
    private static readonly Color RowBorderColor = new(0xE0, 0xE0, 0xE0);

    public byte[] GeneratePdf()
    {
        var renderer = new PdfDocumentRenderer { Document = Compose() };
        renderer.RenderDocument();

        using var stream = new MemoryStream();
        renderer.PdfDocument.Save(stream, false);
        return stream.ToArray();
    }

    private Document Compose()
    {
        var document = new Document();
        var normal = document.Styles[StyleNames.Normal]!;
        normal.Font.Name = PdfFontResolver.FamilyName;
        normal.Font.Size = 9;

        var section = document.AddSection();
        section.PageSetup = document.DefaultPageSetup.Clone();
        section.PageSetup.PageFormat = PageFormat.A4;
        section.PageSetup.LeftMargin = Unit.FromPoint(PageMargin);
        section.PageSetup.RightMargin = Unit.FromPoint(PageMargin);
        section.PageSetup.TopMargin = Unit.FromPoint(PageMargin);
        section.PageSetup.BottomMargin = Unit.FromPoint(PageMargin + 20);
        section.PageSetup.FooterDistance = Unit.FromPoint(PageMargin);

        var contentWidth = section.PageSetup.PageWidth.Point - (PageMargin * 2);

        ComposeHeader(section, contentWidth);
        ComposeTable(section, contentWidth);
        ComposeFooter(section);

        return document;
    }

    private void ComposeHeader(Section section, double contentWidth)
    {
        var title = section.AddParagraph("Transactions");
        title.Format.Font.Size = 18;
        title.Format.Font.Bold = true;

        var range = section.AddParagraph(RangeLabel());
        range.Format.Font.Size = 10;
        range.Format.Font.Color = MutedColor;
        range.Format.SpaceAfter = Unit.FromPoint(8);

        var income = transactions.Where(t => t.Type == FlowType.Income).Sum(t => t.ReportingAmount);
        var expense = transactions.Where(t => t.Type == FlowType.Expense).Sum(t => t.ReportingAmount);

        var summary = section.AddTable();
        summary.Borders.Visible = false;
        summary.LeftPadding = 0;
        summary.RightPadding = 0;
        for (var i = 0; i < 3; i++)
        {
            summary.AddColumn(Unit.FromPoint(contentWidth / 3));
        }

        var row = summary.AddRow();
        row.Cells[0].AddParagraph($"Income: {FormatAmount(income, reportingCurrency)}").Format.Font.Color = IncomeColor;
        row.Cells[1].AddParagraph($"Expense: {FormatAmount(expense, reportingCurrency)}").Format.Font.Color = ExpenseColor;
        row.Cells[2].AddParagraph($"Net: {FormatAmount(income - expense, reportingCurrency)}").Format.Font.Bold = true;

        section.AddParagraph().Format.SpaceAfter = Unit.FromPoint(4);
    }

    private string RangeLabel()
    {
        if (dateFrom is null && dateTo is null)
        {
            return "All time";
        }

        var from = dateFrom?.ToString(DateFormats.IsoDate, CultureInfo.InvariantCulture) ?? "…";
        var to = dateTo?.ToString(DateFormats.IsoDate, CultureInfo.InvariantCulture) ?? "…";
        return $"{from} — {to}";
    }

    private void ComposeTable(Section section, double contentWidth)
    {
        var relativeUnit = (contentWidth - DateColumnWidth - TypeColumnWidth - AmountColumnWidth) / 9;

        var table = section.AddTable();
        table.Borders.Visible = false;
        table.LeftPadding = 0;
        table.RightPadding = Unit.FromPoint(4);
        table.AddColumn(Unit.FromPoint(DateColumnWidth));
        table.AddColumn(Unit.FromPoint(relativeUnit * 3));
        table.AddColumn(Unit.FromPoint(relativeUnit * 2));
        table.AddColumn(Unit.FromPoint(relativeUnit * 2));
        table.AddColumn(Unit.FromPoint(relativeUnit * 2));
        table.AddColumn(Unit.FromPoint(TypeColumnWidth));
        table.AddColumn(Unit.FromPoint(AmountColumnWidth));

        var header = table.AddRow();
        header.HeadingFormat = true;
        header.Format.Font.Bold = true;
        header.TopPadding = Unit.FromPoint(4);
        header.BottomPadding = Unit.FromPoint(4);
        header.Borders.Bottom.Width = Unit.FromPoint(1);
        header.Borders.Bottom.Color = MutedColor;

        var titles = new[] { "Date", "Description", "Account", "Category", "Tags", "Type", "Amount" };
        for (var i = 0; i < titles.Length; i++)
        {
            header.Cells[i].AddParagraph(titles[i]);
        }

        header.Cells[6].Format.Alignment = ParagraphAlignment.Right;

        foreach (var transaction in transactions.OrderByDescending(t => t.Date))
        {
            var category = transaction.CategoryId is { } categoryId ? names.Categories.GetValueOrDefault(categoryId) : null;
            var amount = transaction.Amount;

            var row = table.AddRow();
            row.TopPadding = Unit.FromPoint(3);
            row.BottomPadding = Unit.FromPoint(3);
            row.Borders.Bottom.Width = Unit.FromPoint(0.5);
            row.Borders.Bottom.Color = RowBorderColor;

            row.Cells[0].AddParagraph(transaction.Date.ToString(DateFormats.IsoDate, CultureInfo.InvariantCulture));
            row.Cells[1].AddParagraph(transaction.Description ?? "");
            row.Cells[2].AddParagraph(names.Accounts.GetValueOrDefault(transaction.AccountId) ?? "");
            row.Cells[3].AddParagraph(category ?? "");

            var tagsParagraph = row.Cells[4].AddParagraph(names.TagLabel(transaction.TagIds));
            tagsParagraph.Format.Font.Color = MutedColor;

            row.Cells[5].AddParagraph(transaction.Type.ToString());

            var amountParagraph = row.Cells[6].AddParagraph(FormatAmount(amount, transaction.Currency));
            amountParagraph.Format.Alignment = ParagraphAlignment.Right;
            amountParagraph.Format.Font.Color = transaction.Type == FlowType.Income ? IncomeColor : ExpenseColor;
        }
    }

    private static void ComposeFooter(Section section)
    {
        var footer = section.Footers.Primary.AddParagraph();
        footer.Format.Alignment = ParagraphAlignment.Center;
        footer.AddPageField();
        footer.AddText(" / ");
        footer.AddNumPagesField();
    }

    private static string FormatAmount(decimal amount, Currency currency) =>
        amount.ToString("0.00", CultureInfo.InvariantCulture) + " " + currency.ToCode();
}
