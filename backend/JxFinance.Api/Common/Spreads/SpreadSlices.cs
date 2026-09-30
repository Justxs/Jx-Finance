using JxFinance.Common.SettleUp;
using JxFinance.Domain.Households;

namespace JxFinance.Common.Spreads;

public static class SpreadSlices
{
    public static IReadOnlyList<(DateOnly Date, decimal Amount)> Of(DateOnly date, decimal amount, int months)
    {
        var amounts = ShareAllocator.Allocate(amount, SplitMethod.Equal, [.. Enumerable.Repeat(new SharePart(null, null), months)])!;
        return [.. amounts.Select((part, index) => (date.AddMonths(index), part))];
    }

    public static DateOnly Until(DateOnly date, int months) => date.AddMonths(months - 1);
}
