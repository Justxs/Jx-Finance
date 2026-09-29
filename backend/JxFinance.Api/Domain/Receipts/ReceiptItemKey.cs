using System.Globalization;
using System.Text;

namespace JxFinance.Domain.Receipts;

public static class ReceiptItemKey
{
    private static readonly HashSet<string> Units = new(StringComparer.Ordinal)
    {
        "g", "kg", "mg", "l", "ml", "cl", "dl", "vnt", "pcs", "x",
    };

    public static string Normalize(string name)
    {
        var letters = new StringBuilder(name.Length);
        foreach (var character in name.Normalize(NormalizationForm.FormC))
        {
            letters.Append(char.IsLetter(character) ? char.ToLower(character, CultureInfo.InvariantCulture) : ' ');
        }

        var words = letters.ToString()
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Where(word => !Units.Contains(word));
        var key = string.Join(' ', words);
        return key.Length > ReceiptResult.TextMaxLength ? key[..ReceiptResult.TextMaxLength].TrimEnd() : key;
    }
}
