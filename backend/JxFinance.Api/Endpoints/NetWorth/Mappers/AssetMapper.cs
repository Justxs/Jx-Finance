using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.NetWorth;
using JxFinance.Endpoints.NetWorth.CreateAsset;
using JxFinance.Endpoints.NetWorth.Shared;
using JxFinance.Endpoints.NetWorth.UpdateAsset;

namespace JxFinance.Endpoints.NetWorth.Mappers;

public sealed class AssetMapper : Mapper<CreateAssetRequest, AssetResponse, Asset>
{
    public override Asset ToEntity(CreateAssetRequest request) => new()
    {
        Name = request.Name.Trim(),
        Type = request.Type,
        CurrentValue = MoneyWire.Parse(request.CurrentValue),
        AsOf = request.AsOf,
    };

    public void UpdateEntity(UpdateAssetRequest request, Asset asset)
    {
        asset.Name = request.Name.Trim();
        asset.Type = request.Type;
        asset.CurrentValue = MoneyWire.Parse(request.CurrentValue);
        asset.AsOf = request.AsOf;
    }

    public override AssetResponse FromEntity(Asset asset) => new(
        asset.Id.Value,
        asset.Name,
        asset.Type,
        MoneyWire.ToWire(asset.CurrentValue),
        asset.AsOf);
}
