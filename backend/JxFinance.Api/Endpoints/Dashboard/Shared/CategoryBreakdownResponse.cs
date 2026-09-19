using JxFinance.Common.Json;

namespace JxFinance.Endpoints.Dashboard.Shared;

public sealed record CategoryBreakdownItem(Guid? CategoryId, string CategoryName, string? CategoryIcon, [property: Money] decimal Amount);

public sealed record CategoryBreakdownResponse(
    IReadOnlyList<CategoryBreakdownItem> Items,
    DateOnly PeriodStart,
    DateOnly PeriodEnd);
