namespace JxFinance.Common;

public sealed record TokenWritable
{
    public static TokenWritable Yes { get; } = new();

    public static bool Allows(IEnumerable<object>? metadata) => metadata?.OfType<TokenWritable>().Any() is true;
}
