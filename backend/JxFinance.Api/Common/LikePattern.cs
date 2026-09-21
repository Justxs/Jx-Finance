namespace JxFinance.Common;

public static class LikePattern
{
    public const string Escape = @"\";

    public static string Contains(string text) => $"%{Escaped(text)}%";

    public static string Exactly(string text) => Escaped(text);

    private static string Escaped(string text) =>
        text.Trim().Replace(@"\", @"\\", StringComparison.Ordinal).Replace("%", @"\%", StringComparison.Ordinal).Replace("_", @"\_", StringComparison.Ordinal);
}
