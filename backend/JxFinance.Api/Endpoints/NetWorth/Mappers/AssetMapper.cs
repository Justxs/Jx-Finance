using JxFinance.Domain.Common;
using JxFinance.Domain.NetWorth;
using JxFinance.Endpoints.NetWorth.CreateAsset;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.Mappers;

public static class AssetMapper
{
    public static Asset ToEntity(this CreateAssetRequest request, Currency reportingCurrency)
    {
        var asset = new Asset
        {
            Name = request.Name,
            CurrentValue = new Money(0m, reportingCurrency),
        };
        request.ApplyTo(asset);
        return asset;
    }

    public static void ApplyTo(this IAssetInput input, Asset asset)
    {
        asset.Name = input.Name.Trim();
        asset.Type = input.Type;
        asset.CurrentValue = new Money(input.CurrentValue!.Value, asset.Currency);
        asset.AsOf = input.AsOf;
    }

    public static AssetResponse ToResponse(this Asset asset) => new(
        asset.Id.Value,
        asset.Name,
        asset.Type,
        asset.CurrentValue.Amount,
        asset.AsOf,
        asset.Currency);
}
