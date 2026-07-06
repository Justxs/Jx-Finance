using JxFinance.Domain.NetWorth;

namespace JxFinance.Endpoints.NetWorth;

public sealed record AssetResponse(Guid Id, string Name, AssetType Type, string CurrentValue, DateOnly AsOf);
