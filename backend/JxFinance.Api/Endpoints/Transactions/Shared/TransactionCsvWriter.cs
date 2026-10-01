using System.Globalization;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Transactions.ExportTransactions;

namespace JxFinance.Endpoints.Transactions.Shared;

public static class TransactionCsvWriter
{
    public const string Header = "Date,Description,Account,Category,Tags,Type,Amount,Currency,Note,Spread months,Place,Group";

    public static string Row(TransactionResponse transaction, ExportNames names)
    {
        var category = transaction.CategoryId is { } categoryId ? names.Categories.GetValueOrDefault(categoryId) : null;
        return CsvCell.Row(
            CsvCell.Date(transaction.Date),
            CsvCell.Text(transaction.Description),
            CsvCell.Text(names.Accounts.GetValueOrDefault(transaction.AccountId)),
            CsvCell.Text(category),
            CsvCell.Text(names.TagLabel(transaction.TagIds)),
            CsvCell.Value(transaction.Type.ToString()),
            CsvCell.Money(transaction.Amount),
            CsvCell.Value(transaction.Currency.ToCode()),
            CsvCell.Text(transaction.Note),
            CsvCell.Value(transaction.SpreadMonths?.ToString(CultureInfo.InvariantCulture)),
            CsvCell.Text(transaction.Place),
            CsvCell.Text(names.GroupName(transaction.GroupId)));
    }
}
