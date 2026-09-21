using System.Globalization;
using JxFinance.Domain.Common;

namespace JxFinance.Common.Trash;

public static class TrashLabel
{
    public static string Dated(string? description, DateOnly date, Money amount) =>
        $"{Name(description, date)}, {Amount(amount)}";

    public static string Exchanged(Money from, Money to, DateOnly date) =>
        $"{Amount(from)} → {Amount(to)}, {Iso(date)}";

    public static string Amount(Money amount) => $"{amount} {amount.Currency.ToCode()}";

    private static string Name(string? description, DateOnly date) =>
        OptionalText.Normalize(description) ?? Iso(date);

    private static string Iso(DateOnly date) => date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
}
