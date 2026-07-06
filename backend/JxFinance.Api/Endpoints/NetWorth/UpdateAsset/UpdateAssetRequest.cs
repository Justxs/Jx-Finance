using JxFinance.Domain.NetWorth;

namespace JxFinance.Endpoints.NetWorth.UpdateAsset;

public sealed record UpdateAssetRequest(Guid Id, string Name, AssetType Type, string CurrentValue, DateOnly AsOf);
