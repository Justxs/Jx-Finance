using JxFinance.Common.Formats;

namespace JxFinance.Endpoints.Transactions.ExportTransactions;

public static class ExportFileName
{
    public static string Transactions(DateOnly? dateFrom, DateOnly? dateTo, string extension) =>
        (dateFrom, dateTo) switch
        {
            ({ } from, { } to) => $"jx-finance-transactions-{DateFormats.Iso(from)}-to-{DateFormats.Iso(to)}.{extension}",
            ({ } from, null) => $"jx-finance-transactions-from-{DateFormats.Iso(from)}.{extension}",
            (null, { } to) => $"jx-finance-transactions-to-{DateFormats.Iso(to)}.{extension}",
            _ => $"jx-finance-transactions.{extension}",
        };
}
