namespace JxFinance.Common;

public static class LikePattern
{
    public const string Escape = @"\";

    public static string Contains(string text) =>
        $"%{text.Trim().Replace(@"\", @"\\", StringComparison.Ordinal).Replace("%", @"\%", StringComparison.Ordinal).Replace("_", @"\_", StringComparison.Ordinal)}%";
}
