using System.Diagnostics.CodeAnalysis;
using System.Text.RegularExpressions;

namespace JxFinance.Common.Telegram;

public static partial class TelegramBotToken
{
    public const int MaxLength = 130;

    public static bool IsValid(string? text) => TryParse(text, out _);

    public static bool TryParse(string? text, [NotNullWhen(true)] out string? token)
    {
        token = text?.Trim();
        if (string.IsNullOrEmpty(token) || token.Length > MaxLength || !TokenPattern().IsMatch(token))
        {
            token = null;
            return false;
        }

        return true;
    }

    [GeneratedRegex(@"\A[0-9]{1,20}:[A-Za-z0-9_-]{30,100}\z", RegexOptions.CultureInvariant)]
    private static partial Regex TokenPattern();
}
