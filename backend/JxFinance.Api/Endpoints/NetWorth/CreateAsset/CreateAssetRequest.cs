using JxFinance.Common.Json;
using JxFinance.Domain.NetWorth;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.CreateAsset;

public sealed record CreateAssetRequest(string Name, AssetType Type, [property: Money(NotNull = true)] decimal? CurrentValue, DateOnly AsOf) : IAssetInput;
