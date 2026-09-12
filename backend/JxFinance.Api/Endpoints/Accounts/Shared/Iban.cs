using System.Text.RegularExpressions;

namespace JxFinance.Endpoints.Accounts.Shared;

public static partial class Iban
{
    [GeneratedRegex("^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$")]
    private static partial Regex Pattern();

    public static string? Normalize(string? value)
    {
        var compact = value?.Replace(" ", "").ToUpperInvariant();
        return string.IsNullOrEmpty(compact) ? null : compact;
    }

    public static bool IsValid(string? value)
    {
        var normalized = Normalize(value);
        return normalized is null || Pattern().IsMatch(normalized);
    }
}
