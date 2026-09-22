using System.Diagnostics.CodeAnalysis;

namespace JxFinance.Common;

public static class TextLimit
{
    [return: NotNullIfNotNull(nameof(text))]
    public static string? Ellipsize(string? text, int maxLength)
    {
        if (text is null)
        {
            return null;
        }

        var trimmed = text.Trim();
        return trimmed.Length <= maxLength ? trimmed : trimmed[..(maxLength - 1)] + "…";
    }

    public static string Cut(string text, int maxLength)
    {
        var trimmed = text.Trim();
        return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
    }
}
