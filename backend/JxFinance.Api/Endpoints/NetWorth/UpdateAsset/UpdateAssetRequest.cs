using System.Text.Json.Serialization;
using JxFinance.Common.Json;
using JxFinance.Domain.NetWorth;

namespace JxFinance.Endpoints.NetWorth.UpdateAsset;

public sealed record UpdateAssetRequest(
    Guid Id,
    string Name,
    AssetType Type,
    [property: Money, JsonRequired] decimal CurrentValue,
    DateOnly AsOf);
