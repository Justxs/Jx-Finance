using JxFinance.Domain.NetWorth;

namespace JxFinance.Endpoints.NetWorth.CreateAsset;

public sealed record CreateAssetRequest(string Name, AssetType Type, string CurrentValue, DateOnly AsOf);
