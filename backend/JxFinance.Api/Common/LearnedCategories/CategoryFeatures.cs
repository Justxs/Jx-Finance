using JxFinance.Domain.Accounts;

namespace JxFinance.Common.LearnedCategories;

public static class CategoryFeatures
{
    public const int MinimumWordLength = 2;
    public const int MaxAmountBucket = 20;
    public const string KeyPrefix = "key:";
    public const string AccountPrefix = "account:";
    public const string AmountPrefix = "amount:";

    public static IReadOnlyList<string> Of(string payeeKey, AccountId accountId, decimal amount)
    {
        var words = payeeKey
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Where(word => word.Length >= MinimumWordLength)
            .Distinct(StringComparer.Ordinal);
        string[] key = payeeKey.Length == 0 ? [] : [KeyPrefix + payeeKey];

        return [.. words, .. key, AccountPrefix + accountId.Value, AmountPrefix + AmountBucket(amount)];
    }

    public static bool IsWord(string token) => !token.Contains(':', StringComparison.Ordinal);

    public static int AmountBucket(decimal amount) =>
        Math.Min((int)Math.Floor(Math.Log2((double)Math.Max(amount, 1m))), MaxAmountBucket);
}
