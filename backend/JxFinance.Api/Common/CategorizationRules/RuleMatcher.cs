using JxFinance.Domain.CategorizationRules;

namespace JxFinance.Common.CategorizationRules;

public static class RuleMatcher
{
    public static string LikePatternFor(DescriptionMatch match, string pattern) => match switch
    {
        DescriptionMatch.Contains => LikePattern.Contains(pattern),
        DescriptionMatch.StartsWith => $"{LikePattern.Exactly(pattern)}%",
        _ => LikePattern.Exactly(pattern),
    };

    public static bool Matches(DescriptionMatch match, string pattern, string? description)
    {
        var text = description?.Trim();
        var needle = pattern.Trim();
        if (string.IsNullOrEmpty(text) || needle.Length == 0)
        {
            return false;
        }

        return match switch
        {
            DescriptionMatch.Contains => text.Contains(needle, StringComparison.OrdinalIgnoreCase),
            DescriptionMatch.StartsWith => text.StartsWith(needle, StringComparison.OrdinalIgnoreCase),
            _ => text.Equals(needle, StringComparison.OrdinalIgnoreCase),
        };
    }

    public static bool AmountInRange(decimal amount, decimal? minAmount, decimal? maxAmount) =>
        (minAmount is not { } min || amount >= min) && (maxAmount is not { } max || amount <= max);
}
