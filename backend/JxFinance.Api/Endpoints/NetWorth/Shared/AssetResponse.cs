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
    Currency Currency);
