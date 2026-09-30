using System.Globalization;
using System.Text;

namespace JxFinance.Common.Journal;

public sealed class BeancountNames
{
    private const string Fallback = "X";

    private readonly HashSet<string> taken = new(StringComparer.Ordinal);

    public string Reserve(string account)
    {
        taken.Add(account);
        return account;
    }

    public string Unique(string parent, string name)
    {
        var account = $"{parent}:{Component(name)}";
        var candidate = account;
        for (var suffix = 2; !taken.Add(candidate); suffix++)
        {
            candidate = $"{account}-{suffix.ToString(CultureInfo.InvariantCulture)}";
        }

        return candidate;
    }

    public static string Component(string name)
    {
        var text = new StringBuilder();
        foreach (var letter in name.Normalize(NormalizationForm.FormD))
        {
            if (CharUnicodeInfo.GetUnicodeCategory(letter) == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            var ascii = char.IsAsciiLetterOrDigit(letter) ? letter : '-';
            if (ascii != '-' || (text.Length > 0 && text[^1] != '-'))
            {
                text.Append(ascii);
            }
        }

        var component = text.ToString().TrimEnd('-');
        return component.Length == 0 ? Fallback : char.ToUpperInvariant(component[0]) + component[1..];
    }
}
