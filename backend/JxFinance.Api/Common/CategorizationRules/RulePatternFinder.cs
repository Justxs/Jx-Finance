using JxFinance.Common.Subscriptions;
using JxFinance.Domain.CategorizationRules;

namespace JxFinance.Common.CategorizationRules;

public static class RulePatternFinder
{
    public static (DescriptionMatch Match, string Pattern)? For(IReadOnlyList<string> descriptions, string key)
    {
        var texts = descriptions.Select(d => d.Trim()).ToList();
        if (texts.Count == 0 || texts.Any(t => t.Length == 0))
        {
            return null;
        }

        var prefix = CommonPrefix(texts);
        if (prefix.Length >= SuggestedRules.MinimumPatternLength)
        {
            return (DescriptionMatch.StartsWith, prefix);
        }

        return SharedWord(texts, key) is { } word ? (DescriptionMatch.Contains, word) : null;
    }

    private static string CommonPrefix(List<string> texts)
    {
        var first = texts[0];
        var shortest = texts.Min(t => t.Length);
        var length = 0;
        while (length < shortest && texts.All(t => SameLetter(t[length], first[length])))
        {
            length++;
        }

        while (length > 0 && !EndsWord(texts, length))
        {
            length--;
        }

        return first[..length];
    }

    private static bool EndsWord(List<string> texts, int length)
    {
        var first = texts[0];
        if (!char.IsLetterOrDigit(first[length - 1])
            || texts.Any(t => t.Length > length && char.IsLetterOrDigit(t[length])))
        {
            return false;
        }

        var start = length;
        while (start > 0 && char.IsLetterOrDigit(first[start - 1]))
        {
            start--;
        }

        return !SubscriptionDescription.IsReference(first[start..length]);
    }

    private static string? SharedWord(List<string> texts, string key)
    {
        var word = key
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Where(w => w.Count(char.IsLetter) >= SuggestedRules.MinimumPatternLength)
            .Where(w => texts.All(t => t.Contains(w, StringComparison.OrdinalIgnoreCase)))
            .OrderByDescending(w => w.Length)
            .FirstOrDefault();
        if (word is null)
        {
            return null;
        }

        var index = texts[0].IndexOf(word, StringComparison.OrdinalIgnoreCase);
        return texts[0].Substring(index, word.Length);
    }

    private static bool SameLetter(char left, char right) =>
        char.ToUpperInvariant(left) == char.ToUpperInvariant(right);
}
