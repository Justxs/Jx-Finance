using JxFinance.Common.Json;
using JxFinance.Domain.Common;
using JxFinance.Domain.NetWorth;

namespace JxFinance.Endpoints.NetWorth.Shared;

public sealed record AssetResponse(
    Guid Id,
    string Name,
    AssetType Type,
    [property: Money] decimal CurrentValue,
    DateOnly AsOf,
    Currency Currency,
    [property: Money] decimal Value,
    DepreciationResponse? Depreciation,
    [property: Money] decimal? MonthlyDepreciation,
    DateOnly? FullyDepreciatedOn,
    Scope Scope,
    Guid? HouseholdId);

public sealed record DepreciationResponse(
    DateOnly StartDate,
    [property: Money] decimal StartValue,
    int LifeMonths,
    [property: Money] decimal ResidualValue);

public sealed record AssetValuationResponse(DateOnly Date, [property: Money] decimal Value, string? Note);

public sealed record AssetValuePoint(DateOnly Date, [property: Money] decimal Value, bool IsValuation);

public sealed record AssetValueHistoryResponse(Currency Currency, IReadOnlyList<AssetValuePoint> Points);
