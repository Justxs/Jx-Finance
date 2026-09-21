using JxFinance.Common.Json;

namespace JxFinance.Endpoints.Reports.Shared;

public sealed record TagBreakdownItem(
    Guid? TagId,
    string TagName,
    [property: Money] decimal Amount,
    [property: Money] decimal? ComparisonAmount = null);
