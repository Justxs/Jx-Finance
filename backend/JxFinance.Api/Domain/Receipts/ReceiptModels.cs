namespace JxFinance.Domain.Receipts;

public static class ReceiptModels
{
    public const string Haiku = "claude-haiku-4-5";
    public const string Sonnet = "claude-sonnet-5";
    public const string Opus = "claude-opus-5-5";
    public const string Default = Sonnet;
    public const int MaxLength = 40;
    public const int DefaultMonthlyLimit = 100;
    public const int MaxMonthlyLimit = 10000;

    public static IReadOnlyList<string> Allowed { get; } = [Haiku, Sonnet, Opus];

    public static bool IsAllowed(string? model) => model is not null && Allowed.Contains(model, StringComparer.Ordinal);

    public static int LongEdge(string model) => model == Haiku ? 1568 : 2576;

    public static bool Thinks(string model) => model != Haiku;
}
