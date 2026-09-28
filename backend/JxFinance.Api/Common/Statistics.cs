namespace JxFinance.Common;

public static class Statistics
{
    public const decimal MadScale = 1.4826m;

    public static decimal Median(IReadOnlyList<decimal> values)
    {
        var sorted = values.Order().ToList();
        var middle = sorted.Count / 2;
        return sorted.Count % 2 == 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2m;
    }

    public static decimal Spread(IReadOnlyList<decimal> values, decimal median) =>
        Median(values.Select(value => Math.Abs(value - median)).ToList()) * MadScale;
}
