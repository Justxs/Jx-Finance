using JxFinance.Common.Json;
using JxFinance.Domain.NetWorth;

namespace JxFinance.Endpoints.NetWorth.UpdateAsset;

public sealed record UpdateAssetRequest(
    Guid Id,
    string Name,
    AssetType Type,
    [property: Money(NotNull = true)] decimal? CurrentValue,
    DateOnly AsOf);
