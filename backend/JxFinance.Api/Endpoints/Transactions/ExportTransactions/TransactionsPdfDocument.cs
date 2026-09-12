using System.Globalization;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Transactions.Shared;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace JxFinance.Endpoints.Transactions.ExportTransactions;

public sealed class TransactionsPdfDocument(
    IReadOnlyList<TransactionResponse> transactions,
    Dictionary<Guid, string> accountNames,
    Dictionary<Guid, string> categoryNames,
    DateOnly? dateFrom,
    DateOnly? dateTo) : IDocument
{
    public DocumentMetadata GetMetadata() => DocumentMetadata.Default;

    public void Compose(IDocumentContainer container)
    {
        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(30);
            page.DefaultTextStyle(x => x.FontSize(9));

            page.Header().Element(ComposeHeader);
            page.Content().Element(ComposeTable);
            page.Footer().AlignCenter().Text(x =>
            {
                x.CurrentPageNumber();
                x.Span(" / ");
                x.TotalPages();
            });
        });
    }

    private void ComposeHeader(IContainer container)
    {
        container.Column(column =>
        {
            column.Item().Text("Transactions").FontSize(18).SemiBold();
            column.Item().Text(RangeLabel()).FontSize(10).FontColor(Colors.Grey.Darken1);

            var income = transactions.Where(t => t.Type == FlowType.Income).Sum(t => decimal.Parse(t.Amount, CultureInfo.InvariantCulture));
            var expense = transactions.Where(t => t.Type == FlowType.Expense).Sum(t => decimal.Parse(t.Amount, CultureInfo.InvariantCulture));

            column.Item().PaddingTop(8).Row(row =>
            {
                row.RelativeItem().Text($"Income: {FormatAmount(income)}").FontColor(Colors.Green.Darken2);
                row.RelativeItem().Text($"Expense: {FormatAmount(expense)}").FontColor(Colors.Red.Darken2);
                row.RelativeItem().Text($"Net: {FormatAmount(income - expense)}").SemiBold();
            });
        });
    }

    private string RangeLabel()
    {
        if (dateFrom is null && dateTo is null)
        {
            return "All time";
        }

        var from = dateFrom?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? "…";
        var to = dateTo?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? "…";
        return $"{from} — {to}";
    }

    private void ComposeTable(IContainer container)
    {
        container.Table(table =>
        {
            table.ColumnsDefinition(columns =>
            {
                columns.ConstantColumn(70);
                columns.RelativeColumn(3);
                columns.RelativeColumn(2);
                columns.RelativeColumn(2);
                columns.ConstantColumn(60);
                columns.ConstantColumn(80);
            });

            table.Header(header =>
            {
                foreach (var title in new[] { "Date", "Description", "Account", "Category", "Type", "Amount" })
                {
                    header.Cell().Element(HeaderCellStyle).Text(title);
                }

                static IContainer HeaderCellStyle(IContainer c) =>
                    c.DefaultTextStyle(x => x.SemiBold()).PaddingVertical(4).BorderBottom(1).BorderColor(Colors.Grey.Darken1);
            });

            foreach (var transaction in transactions.OrderByDescending(t => t.Date))
            {
                var category = transaction.CategoryId is { } categoryId ? categoryNames.GetValueOrDefault(categoryId) : null;
                var amount = decimal.Parse(transaction.Amount, CultureInfo.InvariantCulture);
                var amountColor = transaction.Type == FlowType.Income ? Colors.Green.Darken2 : Colors.Red.Darken2;

                table.Cell().Element(BodyCellStyle).Text(transaction.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));
                table.Cell().Element(BodyCellStyle).Text(transaction.Description ?? "");
                table.Cell().Element(BodyCellStyle).Text(accountNames.GetValueOrDefault(transaction.AccountId) ?? "");
                table.Cell().Element(BodyCellStyle).Text(category ?? "");
                table.Cell().Element(BodyCellStyle).Text(transaction.Type.ToString());
                table.Cell().Element(BodyCellStyle).AlignRight().Text(FormatAmount(amount)).FontColor(amountColor);

                static IContainer BodyCellStyle(IContainer c) =>
                    c.PaddingVertical(3).BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2);
            }
        });
    }

    private static string FormatAmount(decimal amount) =>
        amount.ToString("0.00", CultureInfo.InvariantCulture) + " €";
}
