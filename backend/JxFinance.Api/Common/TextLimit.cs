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
        return trimmed.Length <= maxLength ? trimmed : Prefix(trimmed, maxLength - 1) + "…";
    }

    public static string Cut(string text, int maxLength)
    {
        var trimmed = text.Trim();
        return trimmed.Length <= maxLength ? trimmed : Prefix(trimmed, maxLength);
    }

    public static string Prefix(string text, int length) =>
        length > 0 && length < text.Length && char.IsHighSurrogate(text[length - 1])
            ? text[..(length - 1)]
            : text[..length];
}
