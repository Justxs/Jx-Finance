using JxFinance.Domain.Transactions;

namespace JxFinance.Common.Unusual;

public static class UnusualAmountRule
{
    public const int LookBackMonths = 12;
    public const int PayeeMinimumHistory = 4;
    public const int CategoryMinimumHistory = 8;
    public const decimal MinimumFactor = 2m;
    public const decimal SpreadMultiple = 4m;
    public const decimal MinimumExcess = 10m;
    public const decimal MadScale = 1.4826m;
    public const decimal MaximumFactor = 9_999_999.99m;

    public static int MinimumHistory(UnusualBasis basis) =>
        basis == UnusualBasis.Payee ? PayeeMinimumHistory : CategoryMinimumHistory;

    public static UnusualVerdict? Evaluate(decimal amount, IReadOnlyList<decimal> history, UnusualBasis basis)
    {
        if (history.Count < MinimumHistory(basis))
        {
            return null;
        }

        var median = Median(history);
        if (median <= 0m)
        {
            return null;
        }

        var spread = Median(history.Select(value => Math.Abs(value - median)).ToList()) * MadScale;
        var unusual = amount >= MinimumFactor * median
            && amount >= median + (SpreadMultiple * spread)
            && amount - median >= MinimumExcess;

        return unusual
            ? new UnusualVerdict(basis, decimal.Round(median, 2), Math.Min(decimal.Round(amount / median, 2), MaximumFactor), history.Count)
            : null;
    }

    public static decimal Median(IReadOnlyList<decimal> values)
    {
        var sorted = values.Order().ToList();
        var middle = sorted.Count / 2;
        return sorted.Count % 2 == 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2m;
    }
}
