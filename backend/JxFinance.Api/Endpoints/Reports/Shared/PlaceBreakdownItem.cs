using JxFinance.Common.Json;

namespace JxFinance.Endpoints.Reports.Shared;

public sealed record PlaceBreakdownItem(
    string? Place,
    [property: Money] decimal Amount,
    [property: Money] decimal? ComparisonAmount,
    int Count,
    decimal? Latitude,
    decimal? Longitude)
{
    public const int MaxItems = 50;
}
