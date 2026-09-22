using FastEndpoints;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Domain.NetWorth;
using JxFinance.Endpoints.NetWorth.CreateAsset;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.Mappers;

public sealed class AssetMapper : Mapper<CreateAssetRequest, AssetResponse, Asset>
{
    public override Asset ToEntity(CreateAssetRequest request)
    {
        var asset = new Asset
        {
            Name = request.Name,
            CurrentValue = new Money(0m, Resolve<IInstanceSettingsStore>().Current.ReportingCurrency),
        };
        Apply(request, asset);
        return asset;
    }

    public void Apply(IAssetInput input, Asset asset)
    {
        asset.Name = input.Name.Trim();
        asset.Type = input.Type;
        asset.CurrentValue = new Money(input.CurrentValue!.Value, asset.Currency);
        asset.AsOf = input.AsOf;
    }

    public override AssetResponse FromEntity(Asset asset) => new(
        asset.Id.Value,
        asset.Name,
        asset.Type,
        asset.CurrentValue.Amount,
        asset.AsOf,
        asset.Currency);
}
