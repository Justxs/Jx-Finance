using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Domain.NetWorth;
using JxFinance.Endpoints.Accounts;
using JxFinance.Endpoints.NetWorth.CreateAsset;
using JxFinance.Endpoints.NetWorth.CreateDebt;
using JxFinance.Endpoints.NetWorth.UpdateAsset;
using JxFinance.Endpoints.NetWorth.UpdateDebt;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.NetWorth;

public sealed class NetWorthService(AppDbContext db, IAccountService accountService, IClock clock) : INetWorthService
{
    public async Task<IReadOnlyList<AssetResponse>> GetAssetsAsync(CancellationToken cancellationToken)
    {
        var assets = await db.Assets.OrderBy(a => a.CreatedAt).ToListAsync(cancellationToken);
        return assets.Select(ToResponse).ToList();
    }

    public async Task<AssetResponse> CreateAssetAsync(CreateAssetRequest request, CancellationToken cancellationToken)
    {
        var asset = new Asset
        {
            Name = request.Name.Trim(),
            Type = request.Type,
            CurrentValue = MoneyWire.Parse(request.CurrentValue),
            AsOf = request.AsOf,
        };

        db.Assets.Add(asset);
        await db.SaveChangesAsync(cancellationToken);

        return ToResponse(asset);
    }

    public async Task<Result<AssetResponse>> UpdateAssetAsync(
        UpdateAssetRequest request,
        CancellationToken cancellationToken)
    {
        var assetId = new AssetId(request.Id);
        var asset = await db.Assets.FirstOrDefaultAsync(a => a.Id == assetId, cancellationToken);
        if (asset is null)
        {
            return Result<AssetResponse>.Failure(ErrorCodes.NotFound, "Asset not found.");
        }

        asset.Name = request.Name.Trim();
        asset.Type = request.Type;
        asset.CurrentValue = MoneyWire.Parse(request.CurrentValue);
        asset.AsOf = request.AsOf;
        await db.SaveChangesAsync(cancellationToken);

        return Result<AssetResponse>.Success(ToResponse(asset));
    }

    public async Task<Result<Guid>> DeleteAssetAsync(Guid id, CancellationToken cancellationToken)
    {
        var assetId = new AssetId(id);
        var asset = await db.Assets.FirstOrDefaultAsync(a => a.Id == assetId, cancellationToken);
        if (asset is null)
        {
            return Result<Guid>.Failure(ErrorCodes.NotFound, "Asset not found.");
        }

        db.Assets.Remove(asset);
        await db.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(id);
    }

    public async Task<IReadOnlyList<DebtResponse>> GetDebtsAsync(CancellationToken cancellationToken)
    {
        var debts = await db.Debts.OrderBy(d => d.CreatedAt).ToListAsync(cancellationToken);
        return debts.Select(ToResponse).ToList();
    }

    public async Task<DebtResponse> CreateDebtAsync(CreateDebtRequest request, CancellationToken cancellationToken)
    {
        var debt = new Debt
        {
            Name = request.Name.Trim(),
            Type = request.Type,
            OutstandingAmount = MoneyWire.Parse(request.OutstandingAmount),
            InterestRate = request.InterestRate,
            AsOf = request.AsOf,
        };

        db.Debts.Add(debt);
        await db.SaveChangesAsync(cancellationToken);

        return ToResponse(debt);
    }

    public async Task<Result<DebtResponse>> UpdateDebtAsync(
        UpdateDebtRequest request,
        CancellationToken cancellationToken)
    {
        var debtId = new DebtId(request.Id);
        var debt = await db.Debts.FirstOrDefaultAsync(d => d.Id == debtId, cancellationToken);
        if (debt is null)
        {
            return Result<DebtResponse>.Failure(ErrorCodes.NotFound, "Debt not found.");
        }

        debt.Name = request.Name.Trim();
        debt.Type = request.Type;
        debt.OutstandingAmount = MoneyWire.Parse(request.OutstandingAmount);
        debt.InterestRate = request.InterestRate;
        debt.AsOf = request.AsOf;
        await db.SaveChangesAsync(cancellationToken);

        return Result<DebtResponse>.Success(ToResponse(debt));
    }

    public async Task<Result<Guid>> DeleteDebtAsync(Guid id, CancellationToken cancellationToken)
    {
        var debtId = new DebtId(id);
        var debt = await db.Debts.FirstOrDefaultAsync(d => d.Id == debtId, cancellationToken);
        if (debt is null)
        {
            return Result<Guid>.Failure(ErrorCodes.NotFound, "Debt not found.");
        }

        db.Debts.Remove(debt);
        await db.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(id);
    }

    public async Task<NetWorthResponse> GetCurrentAsync(CancellationToken cancellationToken)
    {
        var (accountsTotal, assetsTotal, debtsTotal, netWorth) = await ComputeTotalsAsync(cancellationToken);
        await UpsertTodaySnapshotAsync(accountsTotal, assetsTotal, debtsTotal, netWorth, cancellationToken);

        return new NetWorthResponse(
            MoneyWire.ToWire(new Money(accountsTotal)),
            MoneyWire.ToWire(new Money(assetsTotal)),
            MoneyWire.ToWire(new Money(debtsTotal)),
            MoneyWire.ToWire(new Money(netWorth)));
    }

    public async Task<NetWorthHistoryResponse> GetHistoryAsync(CancellationToken cancellationToken)
    {
        var snapshots = await db.NetWorthSnapshots
            .OrderBy(s => s.Date)
            .ToListAsync(cancellationToken);

        var items = snapshots
            .Select(s => new NetWorthSnapshotItem(
                s.Date,
                MoneyWire.ToWire(s.Accounts),
                MoneyWire.ToWire(s.Assets),
                MoneyWire.ToWire(s.Debts),
                MoneyWire.ToWire(s.NetWorthValue)))
            .ToList();

        return new NetWorthHistoryResponse(items);
    }

    private async Task<(decimal Accounts, decimal Assets, decimal Debts, decimal NetWorth)> ComputeTotalsAsync(
        CancellationToken cancellationToken)
    {
        var accounts = await accountService.GetAllAsync(cancellationToken);
        var accountsTotal = accounts.Sum(a => decimal.Parse(a.CurrentBalance));

        var assetsTotal = await db.Assets.SumAsync(a => (decimal)a.CurrentValue, cancellationToken);
        var debtsTotal = await db.Debts.SumAsync(d => (decimal)d.OutstandingAmount, cancellationToken);

        return (accountsTotal, assetsTotal, debtsTotal, accountsTotal + assetsTotal - debtsTotal);
    }

    private async Task UpsertTodaySnapshotAsync(
        decimal accountsTotal,
        decimal assetsTotal,
        decimal debtsTotal,
        decimal netWorth,
        CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(clock.ToAppTime(clock.UtcNow).DateTime);
        var existing = await db.NetWorthSnapshots.FirstOrDefaultAsync(s => s.Date == today, cancellationToken);

        if (existing is null)
        {
            db.NetWorthSnapshots.Add(new Domain.NetWorth.NetWorthSnapshot
            {
                Date = today,
                Accounts = new Money(accountsTotal),
                Assets = new Money(assetsTotal),
                Debts = new Money(debtsTotal),
                NetWorthValue = new Money(netWorth),
            });
        }
        else
        {
            existing.Accounts = new Money(accountsTotal);
            existing.Assets = new Money(assetsTotal);
            existing.Debts = new Money(debtsTotal);
            existing.NetWorthValue = new Money(netWorth);
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    private static AssetResponse ToResponse(Asset asset) => new(
        asset.Id.Value,
        asset.Name,
        asset.Type,
        MoneyWire.ToWire(asset.CurrentValue),
        asset.AsOf);

    private static DebtResponse ToResponse(Debt debt) => new(
        debt.Id.Value,
        debt.Name,
        debt.Type,
        MoneyWire.ToWire(debt.OutstandingAmount),
        debt.InterestRate,
        debt.AsOf);
}
