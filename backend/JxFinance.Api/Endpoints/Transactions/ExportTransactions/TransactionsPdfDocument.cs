using System.Globalization;
using JxFinance.Common.Email;
using JxFinance.Common.Formats;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.Transactions.Shared;
using JxFinance.Infrastructure.Pdf;
using MigraDoc.DocumentObjectModel;
using MigraDoc.DocumentObjectModel.Tables;
using MigraDoc.Rendering;

namespace JxFinance.Endpoints.Transactions.ExportTransactions;

public sealed class TransactionsPdfDocument(
    IReadOnlyList<TransactionResponse> transactions,
    ExportNames names,
    DateOnly? dateFrom,
    DateOnly? dateTo,
    Currency reportingCurrency,
    string brandName)
{
    private const double PageMargin = 30;
    private const double DateColumnWidth = 70;
    private const double TypeColumnWidth = 60;
    private const double AmountColumnWidth = 80;
    private const double MarkColumnWidth = 30;

    private static readonly Color InkColor = new(0x1C, 0x23, 0x29);
    private static readonly Color IncomeColor = new(0x1F, 0x6A, 0x4B);
    private static readonly Color ExpenseColor = new(0xAD, 0x39, 0x32);
    private static readonly Color MutedColor = new(0x5D, 0x68, 0x72);
    private static readonly Color RowBorderColor = new(0xDF, 0xE4, 0xE8);

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
        ComposeLockup(section, contentWidth);

        var title = section.AddParagraph("Transactions");
        title.Format.Font.Name = PdfFontResolver.SerifFamilyName;
        title.Format.Font.Size = 22;
        title.Format.Font.Bold = true;
        title.Format.Font.Color = InkColor;

        var range = section.AddParagraph(RangeLabel());
        range.Format.Font.Size = 10;
        range.Format.Font.Color = MutedColor;
        range.Format.SpaceAfter = Unit.FromPoint(12);

        var income = transactions.Where(t => t.Type == FlowType.Income).Sum(t => t.ReportingAmount);
        var expense = transactions.Where(t => t.Type == FlowType.Expense).Sum(t => t.ReportingAmount);
        var net = income - expense;

        var summary = section.AddTable();
        summary.Borders.Visible = false;
        summary.LeftPadding = 0;
        summary.RightPadding = 0;
        for (var i = 0; i < 3; i++)
        {
            summary.AddColumn(Unit.FromPoint(contentWidth / 3));
        }

        var labels = summary.AddRow();
        var amounts = summary.AddRow();
        amounts.BottomPadding = Unit.FromPoint(2);
        AddTotal(labels.Cells[0], amounts.Cells[0], "Income", FormatAmount(income, reportingCurrency), IncomeColor);
        AddTotal(labels.Cells[1], amounts.Cells[1], "Expense", FormatAmount(expense, reportingCurrency), InkColor);
        var netAmount = AddTotal(labels.Cells[2], amounts.Cells[2], "Net", FormatAmount(net, reportingCurrency), NetColor(net), ParagraphAlignment.Right);
        netAmount.Format.Font.Name = PdfFontResolver.SerifFamilyName;
        netAmount.Format.Font.Size = 15;
        netAmount.Format.Borders.Bottom.Width = Unit.FromPoint(0.75);
        netAmount.Format.Borders.Bottom.Color = InkColor;
        netAmount.Format.Borders.DistanceFromBottom = Unit.FromPoint(1);
        amounts.Cells[2].Borders.Bottom.Width = Unit.FromPoint(0.75);
        amounts.Cells[2].Borders.Bottom.Color = InkColor;

        section.AddParagraph().Format.SpaceAfter = Unit.FromPoint(8);
    }

    private void ComposeLockup(Section section, double contentWidth)
    {
        var lockup = section.AddTable();
        lockup.Borders.Visible = false;
        lockup.LeftPadding = 0;
        lockup.RightPadding = 0;
        lockup.AddColumn(Unit.FromPoint(MarkColumnWidth));
        lockup.AddColumn(Unit.FromPoint(contentWidth - MarkColumnWidth));

        var row = lockup.AddRow();
        row.VerticalAlignment = VerticalAlignment.Center;
        row.BottomPadding = Unit.FromPoint(14);

        var mark = row.Cells[0].AddImage(PdfBrand.MarkImage);
        mark.Height = Unit.FromPoint(14);
        mark.LockAspectRatio = true;

        var name = row.Cells[1].AddParagraph(brandName);
        name.Format.Font.Name = PdfFontResolver.SerifFamilyName;
        name.Format.Font.Size = 11;
        name.Format.Font.Bold = true;
        name.Format.Font.Color = InkColor;
    }

    private static Paragraph AddTotal(
        Cell labelCell,
        Cell amountCell,
        string label,
        string amount,
        Color color,
        ParagraphAlignment alignment = ParagraphAlignment.Left)
    {
        var labelParagraph = labelCell.AddParagraph(label);
        labelParagraph.Format.Font.Size = 8;
        labelParagraph.Format.Font.Color = MutedColor;
        labelParagraph.Format.Alignment = alignment;

        var amountParagraph = amountCell.AddParagraph(amount);
        amountParagraph.Format.Font.Size = 12;
        amountParagraph.Format.Font.Bold = true;
        amountParagraph.Format.Font.Color = color;
        amountParagraph.Format.Alignment = alignment;
        return amountParagraph;
    }

    private static Color NetColor(decimal net) => net switch
    {
        > 0 => IncomeColor,
        < 0 => ExpenseColor,
        _ => InkColor,
    };

    private string RangeLabel()
    {
        if (dateFrom is null && dateTo is null)
        {
            return "All time";
        }

        var from = dateFrom is { } start ? DateFormats.Iso(start) : "…";
        var to = dateTo is { } end ? DateFormats.Iso(end) : "…";
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

            row.Cells[0].AddParagraph(DateFormats.Iso(transaction.Date));
            row.Cells[1].AddParagraph(transaction.Description ?? "");
            if (transaction.SpreadMonths is { } months)
            {
                var spread = row.Cells[1].AddParagraph(transaction.SpreadDirection == SpreadDirection.Backward
                    ? $"Spread over the {months} months up to this one"
                    : $"Spread over {months} months");
                spread.Format.Font.Color = MutedColor;
            }

            row.Cells[2].AddParagraph(names.Accounts.GetValueOrDefault(transaction.AccountId) ?? "");
            row.Cells[3].AddParagraph(category ?? "");

            var tagsParagraph = row.Cells[4].AddParagraph(names.TagLabel(transaction.TagIds));
            tagsParagraph.Format.Font.Color = MutedColor;

            row.Cells[5].AddParagraph(transaction is { Type: FlowType.Expense, Amount: < 0 } ? "Refund" : transaction.Type.ToString());

            var amountParagraph = row.Cells[6].AddParagraph(FormatAmount(amount, transaction.Currency));
            amountParagraph.Format.Alignment = ParagraphAlignment.Right;
            amountParagraph.Format.Font.Color = transaction.Type == FlowType.Income ? IncomeColor : ExpenseColor;
        }
    }

    private static void ComposeFooter(Section section)
    {
        var footer = section.Footers.Primary.AddParagraph();
        footer.Format.Alignment = ParagraphAlignment.Center;
        footer.Format.Font.Size = 8;
        footer.Format.Font.Color = MutedColor;
        footer.AddText($"{EmailTexts.DefaultProduct} · page ");
        footer.AddPageField();
        footer.AddText(" of ");
        footer.AddNumPagesField();
    }

    private static string FormatAmount(decimal amount, Currency currency) =>
        amount.ToString("0.00", CultureInfo.InvariantCulture) + " " + currency.ToCode();
}
