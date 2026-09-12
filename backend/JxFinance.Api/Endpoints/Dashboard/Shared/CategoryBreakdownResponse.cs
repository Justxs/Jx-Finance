namespace JxFinance.Endpoints.Dashboard.Shared;

public sealed record CategoryBreakdownItem(Guid? CategoryId, string CategoryName, string? CategoryIcon, string Amount);

public sealed record CategoryBreakdownResponse(
    IReadOnlyList<CategoryBreakdownItem> Items,
    DateOnly PeriodStart,
    DateOnly PeriodEnd);
