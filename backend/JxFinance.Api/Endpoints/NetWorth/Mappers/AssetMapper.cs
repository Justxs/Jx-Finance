using JxFinance.Common.Assets;
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
        asset.Depreciation = input.Depreciation is { StartDate: { } start, StartValue: { } value, LifeMonths: { } life, ResidualValue: { } residual }
            ? new Depreciation(start, value, life, residual)
            : null;
    }

    public static AssetResponse ToResponse(this Asset asset, IReadOnlyCollection<AssetValuation> valuations, DateOnly today) => new(
        asset.Id.Value,
        asset.Name,
        asset.Type,
        asset.CurrentValue.Amount,
        asset.AsOf,
        asset.Currency,
        AssetValue.On(today, valuations, asset.Depreciation) ?? 0m,
        asset.Depreciation is { } terms
            ? new DepreciationResponse(terms.StartDate, terms.StartValue, terms.LifeMonths, terms.ResidualValue)
            : null,
        asset.Depreciation is null ? null : AssetValue.MonthlyAmount(asset.Depreciation),
        asset.Depreciation is null ? null : AssetValue.FullyDepreciatedOn(valuations, asset.Depreciation));

    public static AssetValuationResponse ToResponse(this AssetValuation valuation) =>
        new(valuation.Date, valuation.Value, valuation.Note);
}
