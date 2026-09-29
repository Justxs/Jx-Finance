using JxFinance.Domain.Categories;
using JxFinance.Domain.CategorizationRules;
using JxFinance.Domain.Common;

namespace JxFinance.Common.CategorizationRules;

public static class RuleMatcher
{
    public static bool Matches(CategorizationRule rule, FlowType? categoryType, LedgerEntry entry) =>
        (rule.AccountId is not { } ruleAccountId || entry.AccountId == ruleAccountId)
        && (categoryType is not { } type || entry.Type == type)
        && AmountInRange(entry.Amount, rule.MinAmount, rule.MaxAmount)
        && Matches(rule.Match, rule.Pattern, entry.Description);

    public static bool Applies(
        CategorizationRule rule,
        IReadOnlyDictionary<CategoryId, FlowType> categoryTypes,
        LedgerEntry entry)
    {
        if (rule.CategoryId is not { } categoryId)
        {
            return Matches(rule, null, entry);
        }

        return categoryTypes.TryGetValue(categoryId, out var type) && Matches(rule, type, entry);
    }

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
