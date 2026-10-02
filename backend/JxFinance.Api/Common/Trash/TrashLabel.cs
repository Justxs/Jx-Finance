using System.Globalization;
using JxFinance.Common.Formats;
using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;

namespace JxFinance.Common.Trash;

public static class TrashLabel
{
    public static string Dated(string? description, DateOnly date, Money amount) =>
        $"{Name(description, date)}, {Amount(amount)}";

    public static string Exchanged(Money from, Money to, DateOnly date) =>
        $"{Amount(from)} → {Amount(to)}, {DateFormats.Iso(date)}";

    public static string Amount(Money amount) => $"{amount} {amount.Currency.ToCode()}";

    public static string Counted(string name, params (int Count, string One, string Many)[] parts) =>
        string.Join(
            ", ",
            parts
                .Where(part => part.Count > 0)
                .Select(part => $"{part.Count.ToString(CultureInfo.InvariantCulture)} {(part.Count == 1 ? part.One : part.Many)}")
                .Prepend(name));

    public static string Investment(InvestmentTransaction entry, string? symbol, string? relatedSymbol = null)
    {
        var security = symbol is null ? string.Empty : $" {symbol}";
        var what = entry.Type switch
        {
            InvestmentTransactionType.Buy or InvestmentTransactionType.Sell =>
                $"{Verb(entry.Type)} {Quantity(entry.Quantity)}{security}",
            InvestmentTransactionType.Split => $"{Verb(entry.Type)}{security}, ratio {Quantity(entry.Quantity)}",
            InvestmentTransactionType.SymbolChange =>
                $"{Verb(entry.Type)} {Quantity(entry.Quantity)}{security} to {relatedSymbol ?? "another security"}",
            InvestmentTransactionType.Merger => Merger(entry, security, relatedSymbol),
            _ => $"{Verb(entry.Type)}{security}, {Amount(new Money(Math.Abs(entry.CashAmount.Amount), entry.CashAmount.Currency))}",
        };
        return $"{what}, {DateFormats.Iso(entry.Date)}";
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
        InvestmentTransactionType.SymbolChange => "Symbol change",
        InvestmentTransactionType.Merger => "Merger",
        _ => type.ToString(),
    };

    private static string Quantity(decimal quantity) => quantity.ToString("0.########", CultureInfo.InvariantCulture);

    private static string Merger(InvestmentTransaction entry, string security, string? relatedSymbol)
    {
        var shares = entry.RelatedSecurityId is null
            ? string.Empty
            : $" into {Quantity(entry.RelatedQuantity)} {relatedSymbol ?? "another security"}";
        var cash = entry.CashAmount.Amount == 0m ? string.Empty : $", {Amount(entry.CashAmount)}";
        return $"{Verb(entry.Type)} {Quantity(entry.Quantity)}{security}{shares}{cash}";
    }

    private static string Name(string? description, DateOnly date) =>
        OptionalText.Normalize(description) ?? DateFormats.Iso(date);

}
