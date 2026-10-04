using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Assets;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.Sharing;
using JxFinance.Common.Trash;
using JxFinance.Domain.Common;
using JxFinance.Domain.NetWorth;
using JxFinance.Domain.Trash;
using JxFinance.Endpoints.NetWorth.CreateAsset;
using JxFinance.Endpoints.NetWorth.DeleteAssetValuation;
using JxFinance.Endpoints.NetWorth.GetAssetValueHistory;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.Mappers;
using JxFinance.Endpoints.NetWorth.SetAssetValuation;
using JxFinance.Endpoints.NetWorth.Shared;
using JxFinance.Endpoints.NetWorth.UpdateAsset;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.NetWorth.Services;

[RegisterService<IAssetService>(LifeTime.Scoped)]
public sealed class AssetService(
    AppDbContext db,
    IExchangeRateService rates,
    IClock clock,
    IDeletionRecorder deletions,
    ICurrentUser currentUser,
    ISharingGuard sharing) : IAssetService
{
    private static readonly DomainError AssetNotFound = EntityLookup.NotFound("Asset not found.");

    public async Task<IReadOnlyList<AssetResponse>> GetAssetsAsync(CancellationToken cancellationToken)
    {
        var assets = await db.Assets.AsNoTracking().OrderBy(a => a.CreatedAt).ToListAsync(cancellationToken);
        return assets.Select(ToResponse).ToList();
    }

    public async Task<Result<AssetResponse>> CreateAssetAsync(
        CreateAssetRequest request,
        CancellationToken cancellationToken)
    {
        if (await sharing.CheckAsync(request, cancellationToken) is { } error)
        {
            return error;
        }

        var asset = request.ToEntity(rates.ReportingCurrency);
        db.Assets.Add(asset);
        await AssetValuationBook.RecordAsync(db, asset, request.AsOf, request.CurrentValue!.Value, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        return ToResponse(asset);
    }

    public async Task<Result<AssetResponse>> UpdateAssetAsync(
        UpdateAssetRequest request,
        CancellationToken cancellationToken)
    {
        var found = await FindAssetAsync(request.Id, cancellationToken);
        if (!found.TryGetValue(out var asset))
        {
            return found.Error;
        }

        if (await sharing.CheckAsync(asset, request, cancellationToken) is { } error)
        {
            return error;
        }

        request.ApplyTo(asset);
        if (request.CurrentValue != asset.CurrentValue.Amount || request.AsOf != asset.AsOf)
        {
            await AssetValuationBook.RecordAsync(db, asset, request.AsOf, request.CurrentValue!.Value, cancellationToken);
        }

        await db.SaveChangesAsync(cancellationToken);
        return ToResponse(asset);
    }

    public async Task<Result<IReadOnlyList<AssetValuationResponse>>> GetValuationsAsync(Guid id, CancellationToken cancellationToken)
    {
        var found = await FindAssetAsync(id, cancellationToken);
        if (!found.TryGetValue(out var asset))
        {
            return found.Error;
        }

        var valuations = await db.AssetValuations
            .AsNoTracking()
            .Where(v => v.AssetId == asset.Id)
            .OrderByDescending(v => v.Date)
            .ToListAsync(cancellationToken);
        return valuations.Select(v => v.ToResponse()).ToList();
    }

    public async Task<Result<AssetResponse>> SetValuationAsync(
        SetAssetValuationRequest request,
        CancellationToken cancellationToken)
    {
        var found = await FindAssetAsync(request.Id, cancellationToken);
        if (!found.TryGetValue(out var asset))
        {
            return found.Error;
        }

        var point = await AssetValuationBook.RecordAsync(db, asset, request.Date, request.Value!.Value, cancellationToken);
        point.Note = OptionalText.Normalize(request.Note);
        if (await db.SaveOrConflictAsync(new DomainError(ErrorCodes.ConflictBusy, "Someone else recorded a valuation for that date just now. Try again."), cancellationToken) is { } conflict)
        {
            return conflict;
        }

        return ToResponse(asset);
    }

    public async Task<Result> DeleteValuationAsync(DeleteAssetValuationRequest request, CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await db.Database.LockAsync(request.Id, cancellationToken);
        var found = await FindAssetAsync(request.Id, cancellationToken);
        if (!found.TryGetValue(out var asset))
        {
            return found.Error;
        }

        var point = await db.AssetValuations.FindOrNotFoundAsync(
            v => v.AssetId == asset.Id && v.Date == request.Date,
            EntityLookup.NotFound("No valuation is recorded for that date."),
            cancellationToken);
        if (!point.TryGetValue(out var valuation))
        {
            return point.Error;
        }

        var removed = await AssetValuationBook.RemoveAsync(db, asset, valuation, cancellationToken);
        if (removed.IsSuccess)
        {
            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }

        return removed;
    }

    public async Task<Result<AssetValueHistoryResponse>> GetValueHistoryAsync(
        GetAssetValueHistoryRequest request,
        CancellationToken cancellationToken)
    {
        var found = await FindAssetAsync(request.Id, cancellationToken);
        if (!found.TryGetValue(out var asset))
        {
            return found.Error;
        }

        var valuations = await db.AssetValuations.AsNoTracking().Where(v => v.AssetId == asset.Id).ToListAsync(cancellationToken);
        var today = clock.Today;
        var to = request.To is { } end && end < today ? end : today;
        if (valuations.Count == 0)
        {
            return new AssetValueHistoryResponse(asset.Currency, []);
        }

        var first = valuations.Min(v => v.Date);
        var from = request.From is { } start && start > first ? start : first;
        var points = from > to
            ? []
            : AssetValue.Series(from, to, valuations, asset.Depreciation)
                .Select(point => new AssetValuePoint(point.Date, point.Value, point.IsValuation))
                .ToList();
        return new AssetValueHistoryResponse(asset.Currency, points);
    }

    public Task<Result<Guid>> DeleteAssetAsync(Guid id, CancellationToken cancellationToken)
    {
        var assetId = new AssetId(id);
        return db.DeleteOrNotFoundAsync<Asset>(
            id,
            a => a.Id == assetId,
            AssetNotFound,
            asset => OwnerDeletion.CheckAsync(asset, currentUser.Id, deletions, TrashKind.Asset, id, asset.Name, "Only the owner can delete a shared asset."),
            cancellationToken);
    }

    private Task<Result<Asset>> FindAssetAsync(Guid id, CancellationToken cancellationToken)
    {
        var assetId = new AssetId(id);
        return db.Assets.FindOrNotFoundAsync(a => a.Id == assetId, AssetNotFound, cancellationToken);
    }

    private AssetResponse ToResponse(Asset asset) => asset.ToResponse([asset.Newest], clock.Today, currentUser.Id);
}
