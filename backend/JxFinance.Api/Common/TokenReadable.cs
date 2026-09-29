namespace JxFinance.Common;

public sealed record TokenReadable(bool Readable)
{
    public static TokenReadable Yes { get; } = new(true);

    public static TokenReadable No { get; } = new(false);

    public static bool Allows(IEnumerable<object>? metadata) =>
        metadata?.OfType<TokenReadable>().ToList() is { Count: > 0 } marks && marks.All(mark => mark.Readable);
}
