using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Domain.NetWorth;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.NetWorth.Services;

public static class AssetValuationBook
{
    public static async Task<AssetValuation> RecordAsync(
        AppDbContext db,
        Asset asset,
        DateOnly date,
        decimal value,
        CancellationToken cancellationToken)
    {
        var point = await db.AssetValuations.FindAsync([asset.Id, date], cancellationToken);
        if (point is null)
        {
            point = new AssetValuation { AssetId = asset.Id, Date = date, Value = value };
            db.AssetValuations.Add(point);
        }
        else
        {
            point.Value = value;
        }

        if (date >= asset.AsOf)
        {
            asset.CurrentValue = new Money(value, asset.Currency);
            asset.AsOf = date;
        }

        return point;
    }

    public static async Task<Result> RemoveAsync(
        AppDbContext db,
        Asset asset,
        AssetValuation point,
        CancellationToken cancellationToken)
    {
        var newest = await db.AssetValuations
            .AsNoTracking()
            .Where(v => v.AssetId == asset.Id && v.Date != point.Date)
            .OrderByDescending(v => v.Date)
            .FirstOrDefaultAsync(cancellationToken);
        if (newest is null)
        {
            return Result.Failure(ErrorCodes.AssetLastValuation, "An asset keeps at least one valuation. Delete the asset instead.");
        }

        db.AssetValuations.Remove(point);
        asset.CurrentValue = new Money(newest.Value, asset.Currency);
        asset.AsOf = newest.Date;
        return Result.Success();
    }
}
