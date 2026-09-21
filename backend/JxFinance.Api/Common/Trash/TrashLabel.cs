using System.Globalization;
using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;

namespace JxFinance.Common.Trash;

public static class TrashLabel
{
    public static string Dated(string? description, DateOnly date, Money amount) =>
        $"{Name(description, date)}, {Amount(amount)}";

    public static string Exchanged(Money from, Money to, DateOnly date) =>
        $"{Amount(from)} → {Amount(to)}, {Iso(date)}";

    public static string Amount(Money amount) => $"{amount} {amount.Currency.ToCode()}";

    public static string Investment(InvestmentTransaction entry, string? symbol)
    {
        var security = symbol is null ? string.Empty : $" {symbol}";
        var what = entry.Type switch
        {
            InvestmentTransactionType.Buy or InvestmentTransactionType.Sell =>
                $"{Verb(entry.Type)} {Quantity(entry.Quantity)}{security}",
            InvestmentTransactionType.Split => $"{Verb(entry.Type)}{security}, ratio {Quantity(entry.Quantity)}",
            _ => $"{Verb(entry.Type)}{security}, {Amount(new Money(Math.Abs(entry.CashAmount.Amount), entry.CashAmount.Currency))}",
        };
        return $"{what}, {Iso(entry.Date)}";
    }

    private static string Verb(InvestmentTransactionType type) => type switch
    {
        InvestmentTransactionType.Buy => "Buy",
        InvestmentTransactionType.Sell => "Sell",
        InvestmentTransactionType.Dividend => "Dividend",
        InvestmentTransactionType.WithholdingTax => "Withholding tax",
        InvestmentTransactionType.Interest => "Interest",
        InvestmentTransactionType.Fee => "Fee",
        InvestmentTransactionType.Split => "Split",
        _ => type.ToString(),
    };

    private static string Quantity(decimal quantity) => quantity.ToString("0.########", CultureInfo.InvariantCulture);

    private static string Name(string? description, DateOnly date) =>
        OptionalText.Normalize(description) ?? Iso(date);

    private static string Iso(DateOnly date) => date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
}
