using System.Text.Json.Serialization;
using JxFinance.Common.Json;
using JxFinance.Domain.NetWorth;

namespace JxFinance.Endpoints.NetWorth.CreateAsset;

public sealed record CreateAssetRequest(string Name, AssetType Type, [property: Money, JsonRequired] decimal CurrentValue, DateOnly AsOf);
