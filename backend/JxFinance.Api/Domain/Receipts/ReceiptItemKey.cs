using System.Globalization;
using System.Text;

namespace JxFinance.Domain.Receipts;

public static class ReceiptItemKey
{
    private static readonly HashSet<string> Units = new(StringComparer.Ordinal)
    {
        "g", "kg", "mg", "l", "ml", "cl", "dl", "vnt", "pcs", "x",
    };

    public static string Fold(string text)
    {
        var folded = new StringBuilder(text.Length);
        foreach (var character in text.Normalize(NormalizationForm.FormD))
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark)
            {
                folded.Append(char.ToLower(character, CultureInfo.InvariantCulture));
            }
        }

        return folded.ToString();
    }

    public static string Normalize(string name)
    {
        var letters = new StringBuilder(name.Length);
        foreach (var character in Fold(name))
        {
            letters.Append(char.IsLetter(character) ? character : ' ');
        }

        var words = letters.ToString()
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Where(word => !Units.Contains(word));
        var key = string.Join(' ', words);
        return key.Length > ReceiptResult.TextMaxLength ? key[..ReceiptResult.TextMaxLength].TrimEnd() : key;
    }
}
