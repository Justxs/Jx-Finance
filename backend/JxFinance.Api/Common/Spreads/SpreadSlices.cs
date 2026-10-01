using JxFinance.Common.SettleUp;
using JxFinance.Domain.Households;
using JxFinance.Domain.Transactions;

namespace JxFinance.Common.Spreads;

public static class SpreadSlices
{
    public static IReadOnlyList<(DateOnly Date, decimal Amount)> Of(
        DateOnly date,
        decimal amount,
        int months,
        SpreadDirection direction = SpreadDirection.Forward)
    {
        var first = FirstOffset(months, direction);
        var amounts = ShareAllocator.Allocate(amount, SplitMethod.Equal, [.. Enumerable.Repeat(new SharePart(null, null), months)])!;
        return [.. amounts.Select((part, index) => (date.AddMonths(first + index), part))];
    }

    public static (DateOnly From, DateOnly Until) Range(DateOnly date, int months, SpreadDirection direction)
    {
        var first = FirstOffset(months, direction);
        return (date.AddMonths(first), date.AddMonths(first + months - 1));
    }

    private static int FirstOffset(int months, SpreadDirection direction) =>
        direction == SpreadDirection.Backward ? 1 - months : 0;
}
