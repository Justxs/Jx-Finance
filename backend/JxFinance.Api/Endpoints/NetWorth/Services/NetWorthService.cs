using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Validation;
using JxFinance.Domain.Common;
using JxFinance.Domain.NetWorth;
using JxFinance.Endpoints.Accounts.Interfaces;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.Shared;
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
    private const string AssetNotFound = "Asset not found.";
    private const string DebtNotFound = "Debt not found.";

    public async Task<IReadOnlyList<Asset>> GetAssetsAsync(CancellationToken cancellationToken) =>
        await db.Assets.OrderBy(a => a.CreatedAt).ToListAsync(cancellationToken);

    public async Task<Asset> CreateAssetAsync(Asset asset, CancellationToken cancellationToken)
    {
        db.Assets.Add(asset);
        await db.SaveChangesAsync(cancellationToken);

        return asset;
    }

    public Task<Result<Asset>> UpdateAssetAsync(Guid id, Action<Asset> apply, CancellationToken cancellationToken)
    {
        var assetId = new AssetId(id);
        return db.UpdateOrNotFoundAsync(a => a.Id == assetId, AssetNotFound, apply, cancellationToken);
    }

    public Task<Result<Guid>> DeleteAssetAsync(Guid id, CancellationToken cancellationToken)
    {
        var assetId = new AssetId(id);
        return db.DeleteOrNotFoundAsync<Asset>(id, a => a.Id == assetId, AssetNotFound, cancellationToken);
    }

    public async Task<IReadOnlyList<Debt>> GetDebtsAsync(CancellationToken cancellationToken) =>
        await db.Debts.OrderBy(d => d.CreatedAt).ToListAsync(cancellationToken);

    public async Task<Debt> CreateDebtAsync(Debt debt, CancellationToken cancellationToken)
    {
        db.Debts.Add(debt);
        await db.SaveChangesAsync(cancellationToken);

        return debt;
    }

    public Task<Result<Debt>> UpdateDebtAsync(Guid id, Action<Debt> apply, CancellationToken cancellationToken)
    {
        var debtId = new DebtId(id);
        return db.UpdateOrNotFoundAsync(d => d.Id == debtId, DebtNotFound, apply, cancellationToken);
    }

    public Task<Result<Guid>> DeleteDebtAsync(Guid id, CancellationToken cancellationToken)
    {
        var debtId = new DebtId(id);
        return db.DeleteOrNotFoundAsync<Debt>(id, d => d.Id == debtId, DebtNotFound, cancellationToken);
    }

    public async Task<NetWorthResponse> GetCurrentAsync(CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await db.Database.LockAsync(currentUser.Id, cancellationToken);
        var (accountsTotal, assetsTotal, debtsTotal, netWorth, isComplete) = await ComputeTotalsAsync(cancellationToken);
        var fitsSnapshot = new[] { accountsTotal, assetsTotal, debtsTotal, netWorth }.All(total => DecimalRules.FitsMoney(Money.Round(total)));
        if (isComplete && fitsSnapshot)
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
}
