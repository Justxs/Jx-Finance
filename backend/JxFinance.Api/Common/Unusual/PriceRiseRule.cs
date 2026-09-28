namespace JxFinance.Common.Unusual;

public static class PriceRiseRule
{
    public const int LookBackMonths = 13;
    public const decimal MinimumRatio = 1.03m;
    public const decimal MinimumExcess = 0.50m;

    public static bool IsRise(decimal charged, decimal expected) =>
        expected > 0m && charged > expected * MinimumRatio && charged - expected > MinimumExcess;

    public static decimal? Expected(decimal? fixedAmount, IReadOnlyList<decimal> earlierCharges) =>
        fixedAmount is { } amount
            ? amount
            : earlierCharges.Count > 0 ? Statistics.Median(earlierCharges) : null;
}
