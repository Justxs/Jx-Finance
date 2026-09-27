using System.Text;

namespace JxFinance.Common.Discord;

public static class DiscordText
{
    public const int UsernameMaxLength = 80;

    private const string MarkdownCharacters = "\\*_~`|>[]()#-";

    public static string Escape(string text)
    {
        var builder = new StringBuilder(text.Length + 8);
        foreach (var character in text)
        {
            if (character is '\r' or '\n' or '\t')
            {
                builder.Append(' ');
                continue;
            }

            if (MarkdownCharacters.Contains(character, StringComparison.Ordinal))
            {
                builder.Append('\\');
            }

            builder.Append(character);
        }

        return builder.ToString();
    }

    public static string Username(string product)
    {
        var name = product.Trim();
        if (name.Length == 0
            || name.Contains("discord", StringComparison.OrdinalIgnoreCase)
            || name.Contains("clyde", StringComparison.OrdinalIgnoreCase))
        {
            return Email.EmailTexts.DefaultProduct;
        }

        return TextLimit.Cut(name, UsernameMaxLength);
    }
}
