using JxFinance.Common.Json;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Investments.Shared;

public sealed record ValueHistoryPoint(
    DateOnly Date,
    [property: Money] decimal MarketValue,
    [property: Money] decimal CostBasis,
    bool IsPartial);

public sealed record ValueHistoryResponse(Currency ReportingCurrency, IReadOnlyList<ValueHistoryPoint> Points);
