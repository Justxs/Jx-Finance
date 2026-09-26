namespace JxFinance.Common;

public static class GuidList
{
    private static readonly char[] Separator = [','];

    public static IReadOnlyList<Guid> Parse(string? value) =>
        [.. Split(value).Where(part => Guid.TryParse(part, out _)).Select(Guid.Parse).Distinct()];

    public static bool IsWellFormed(string? value, int max)
    {
        var parts = Split(value);
        return parts.Length <= max && Array.TrueForAll(parts, part => Guid.TryParse(part, out _));
    }

    private static string[] Split(string? value) =>
        string.IsNullOrWhiteSpace(value)
            ? []
            : value.Split(Separator, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}
