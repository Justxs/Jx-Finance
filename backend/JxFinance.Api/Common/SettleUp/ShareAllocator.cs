using JxFinance.Domain.Households;

namespace JxFinance.Common.SettleUp;

public sealed record SharePart(int? Weight, decimal? Amount);

public static class ShareAllocator
{
    public static IReadOnlyList<decimal>? Allocate(decimal total, SplitMethod method, IReadOnlyList<SharePart> parts) =>
        method switch
        {
            SplitMethod.Equal => ByWeight(total, [.. parts.Select(_ => 1)]),
            SplitMethod.Shares => ByWeight(total, [.. parts.Select(part => part.Weight ?? 0)]),
            _ => Exactly(total, parts),
        };

    private static List<decimal>? ByWeight(decimal total, IReadOnlyList<int> weights)
    {
        var sum = weights.Sum();
        if (sum <= 0 || weights.Any(weight => weight < 0))
        {
            return null;
        }

        var cents = total * 100;
        var floors = weights.Select(weight => decimal.Floor(cents * weight / sum)).ToList();
        var left = (int)(cents - floors.Sum());
        var bonus = weights
            .Select((weight, index) => (Index: index, Remainder: (cents * weight) - (floors[index] * sum)))
            .OrderByDescending(part => part.Remainder)
            .ThenBy(part => part.Index)
            .Take(left)
            .Select(part => part.Index)
            .ToHashSet();

        return [.. floors.Select((floor, index) => (floor + (bonus.Contains(index) ? 1 : 0)) / 100)];
    }

    private static List<decimal>? Exactly(decimal total, IReadOnlyList<SharePart> parts)
    {
        if (parts.Any(part => part.Amount is null or < 0))
        {
            return null;
        }

        var amounts = parts.Select(part => part.Amount!.Value).ToList();
        return amounts.Sum() == total ? amounts : null;
    }
}
