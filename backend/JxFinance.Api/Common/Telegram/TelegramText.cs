using System.Text;

namespace JxFinance.Common.Telegram;

public static class TelegramText
{
    public const char WordJoiner = '⁠';

    public static string Escape(string text)
    {
        var builder = new StringBuilder(text.Length + 8);
        foreach (var character in text)
        {
            switch (character)
            {
                case '\r' or '\n' or '\t':
                    builder.Append(' ');
                    break;
                case '&':
                    builder.Append("&amp;");
                    break;
                case '<':
                    builder.Append("&lt;");
                    break;
                case '>':
                    builder.Append("&gt;");
                    break;
                case '@':
                    builder.Append('@').Append(WordJoiner);
                    break;
                default:
                    builder.Append(character);
                    break;
            }
        }

        return builder.ToString();
    }

    public static string Clip(string html, int maxLength)
    {
        if (html.Length <= maxLength)
        {
            return html;
        }

        var cut = TextLimit.Prefix(html, maxLength - 1);
        var entity = cut.LastIndexOf('&');
        if (entity > cut.LastIndexOf(';'))
        {
            cut = cut[..entity];
        }

        return cut + "…";
    }
}
