using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Domain.NetWorth;
using JxFinance.Endpoints.Accounts.Interfaces;
using JxFinance.Endpoints.NetWorth.CreateAsset;
using JxFinance.Endpoints.NetWorth.CreateDebt;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.Shared;
using JxFinance.Endpoints.NetWorth.UpdateAsset;
using JxFinance.Endpoints.NetWorth.UpdateDebt;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.NetWorth.Services;

[RegisterService<INetWorthService>(LifeTime.Scoped)]
public sealed class NetWorthService(
    AppDbContext db,
    IAccountService accountService,
    IClock clock,
    ICurrentUser currentUser) : INetWorthService
{
    public async Task<IReadOnlyList<Asset>> GetAssetsAsync(CancellationToken cancellationToken) =>
        await db.Assets.OrderBy(a => a.CreatedAt).ToListAsync(cancellationToken);

    public async Task<Asset> CreateAssetAsync(Asset asset, CancellationToken cancellationToken)
    {
        db.Assets.Add(asset);
        await db.SaveChangesAsync(cancellationToken);

        return asset;
    }

    public async Task<Result<Asset>> UpdateAssetAsync(Guid id, Action<Asset> apply, CancellationToken cancellationToken)
    {
        var assetId = new AssetId(id);
        var asset = await db.Assets.FirstOrDefaultAsync(a => a.Id == assetId, cancellationToken);
        if (asset is null)
        {
            return Result<Asset>.Failure(ErrorCodes.ResourceNotFound, "Asset not found.");
        }

        apply(asset);
        await db.SaveChangesAsync(cancellationToken);

        return Result<Asset>.Success(asset);
    }

    public async Task<Result<Guid>> DeleteAssetAsync(Guid id, CancellationToken cancellationToken)
    {
        var assetId = new AssetId(id);
        var asset = await db.Assets.FirstOrDefaultAsync(a => a.Id == assetId, cancellationToken);
        if (asset is null)
        {
            return Result<Guid>.Failure(ErrorCodes.ResourceNotFound, "Asset not found.");
        }

        db.Assets.Remove(asset);
        await db.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(id);
    }

    public async Task<IReadOnlyList<Debt>> GetDebtsAsync(CancellationToken cancellationToken) =>
        await db.Debts.OrderBy(d => d.CreatedAt).ToListAsync(cancellationToken);

    public async Task<Debt> CreateDebtAsync(Debt debt, CancellationToken cancellationToken)
    {
        db.Debts.Add(debt);
        await db.SaveChangesAsync(cancellationToken);

        return debt;
    }

    public async Task<Result<Debt>> UpdateDebtAsync(Guid id, Action<Debt> apply, CancellationToken cancellationToken)
    {
        var debtId = new DebtId(id);
        var debt = await db.Debts.FirstOrDefaultAsync(d => d.Id == debtId, cancellationToken);
        if (debt is null)
        {
            return Result<Debt>.Failure(ErrorCodes.ResourceNotFound, "Debt not found.");
        }

        apply(debt);
        await db.SaveChangesAsync(cancellationToken);

        return Result<Debt>.Success(debt);
    }

    public async Task<Result<Guid>> DeleteDebtAsync(Guid id, CancellationToken cancellationToken)
    {
        var debtId = new DebtId(id);
        var debt = await db.Debts.FirstOrDefaultAsync(d => d.Id == debtId, cancellationToken);
        if (debt is null)
        {
            return Result<Guid>.Failure(ErrorCodes.ResourceNotFound, "Debt not found.");
        }

        db.Debts.Remove(debt);
        await db.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(id);
    }

    public async Task<NetWorthResponse> GetCurrentAsync(CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var lockId = BitConverter.ToInt64(currentUser.Id.ToByteArray(), 0);
        await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock({lockId})", cancellationToken);
        var (accountsTotal, assetsTotal, debtsTotal, netWorth, isComplete) = await ComputeTotalsAsync(cancellationToken);
        if (isComplete)
        {
            await UpsertTodaySnapshotAsync(accountsTotal, assetsTotal, debtsTotal, netWorth, cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);

        return new NetWorthResponse(
            accountsTotal,
            assetsTotal,
            debtsTotal,
            netWorth);
    }

    public async Task<NetWorthHistoryResponse> GetHistoryAsync(CancellationToken cancellationToken)
    {
        var snapshots = await db.NetWorthSnapshots
            .OrderBy(s => s.Date)
            .ToListAsync(cancellationToken);

        var items = snapshots
            .Select(s => new NetWorthSnapshotItem(
                s.Date,
                s.Accounts.Amount,
                s.Assets.Amount,
                s.Debts.Amount,
                s.NetWorthValue.Amount))
            .ToList();

        return new NetWorthHistoryResponse(items);
    }

    private async Task<(decimal Accounts, decimal Assets, decimal Debts, decimal NetWorth, bool IsComplete)> ComputeTotalsAsync(
        CancellationToken cancellationToken)
    {
        var (accountsTotal, isComplete) = await accountService.GetReportingTotalAsync(cancellationToken);

        var assetsTotal = await db.Assets.SumAsync(a => (decimal)a.CurrentValue, cancellationToken);
        var debtsTotal = await db.Debts.SumAsync(d => (decimal)d.OutstandingAmount, cancellationToken);

        return (accountsTotal, assetsTotal, debtsTotal, accountsTotal + assetsTotal - debtsTotal, isComplete);
    }

    private async Task UpsertTodaySnapshotAsync(
        decimal accountsTotal,
        decimal assetsTotal,
        decimal debtsTotal,
        decimal netWorth,
        CancellationToken cancellationToken)
    {
        var today = clock.Today;
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
        asset.CurrentValue.Amount,
        asset.AsOf);

    private static DebtResponse ToResponse(Debt debt) => new(
        debt.Id.Value,
        debt.Name,
        debt.Type,
        debt.OutstandingAmount.Amount,
        debt.InterestRate,
        debt.AsOf);
}
