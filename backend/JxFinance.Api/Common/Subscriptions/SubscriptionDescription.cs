using System.Text;

namespace JxFinance.Common.Subscriptions;

public static class SubscriptionDescription
{
    public const int MaxLength = 200;
    public const int ReferenceDigitCount = 3;

    public static string Normalize(string? description)
    {
        if (string.IsNullOrWhiteSpace(description))
        {
            return string.Empty;
        }

        var words = new List<string>();
        var word = new StringBuilder(description.Length);
        foreach (var character in description)
        {
            if (char.IsLetterOrDigit(character))
            {
                word.Append(char.ToLowerInvariant(character));
                continue;
            }

            Take(words, word);
        }

        Take(words, word);

        var normalized = string.Join(' ', words);
        return normalized.Length <= MaxLength ? normalized : normalized[..MaxLength].TrimEnd();
    }

    private static void Take(List<string> words, StringBuilder word)
    {
        if (word.Length == 0)
        {
            return;
        }

        var token = word.ToString();
        word.Clear();
        if (!IsReference(token))
        {
            words.Add(token);
        }
    }

    private static bool IsReference(string token)
    {
        var digits = 0;
        foreach (var character in token)
        {
            if (char.IsDigit(character))
            {
                digits++;
            }
        }

        return digits == token.Length || digits >= ReferenceDigitCount;
    }
}
