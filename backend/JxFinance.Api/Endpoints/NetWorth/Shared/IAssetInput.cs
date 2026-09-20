using JxFinance.Domain.NetWorth;

namespace JxFinance.Endpoints.NetWorth.Shared;

public interface IAssetInput
{
    string Name { get; }
    AssetType Type { get; }
    decimal? CurrentValue { get; }
    DateOnly AsOf { get; }
}
