using JxFinance.Common.Json;

namespace JxFinance.Endpoints.Reports.Shared;

public sealed record PayeeBreakdownItem(
    string? PayeeKey,
    string? Label,
    [property: Money] decimal Amount,
    [property: Money] decimal? ComparisonAmount,
    int Count)
{
    public const int MaxItems = 50;

    public string? Name { get; init; }
}
