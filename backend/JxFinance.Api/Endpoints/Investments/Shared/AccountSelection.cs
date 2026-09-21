namespace JxFinance.Endpoints.Investments.Shared;

public static class AccountSelection
{
    public const int MaxAccounts = 50;

    private static readonly char[] Separator = [','];

    public static IReadOnlyList<Guid> Parse(string? value)
    {
        var parts = Split(value);
        var ids = new List<Guid>(parts.Length);
        foreach (var part in parts)
        {
            if (Guid.TryParse(part, out var id) && !ids.Contains(id))
            {
                ids.Add(id);
            }
        }

        return ids;
    }

    public static bool IsWellFormed(string? value)
    {
        var parts = Split(value);
        return parts.Length <= MaxAccounts && Array.TrueForAll(parts, part => Guid.TryParse(part, out _));
    }

    private static string[] Split(string? value) =>
        string.IsNullOrWhiteSpace(value)
            ? []
            : value.Split(Separator, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}
