using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Amortization;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.Trash;
using JxFinance.Common.Validation;
using JxFinance.Domain.Common;
using JxFinance.Domain.NetWorth;
using JxFinance.Domain.Trash;
using JxFinance.Endpoints.Accounts.Interfaces;
using JxFinance.Endpoints.NetWorth.CreateAsset;
using JxFinance.Endpoints.NetWorth.CreateDebt;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.Mappers;
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
    IExchangeRateService rates,
    IClock clock,
    IDeletionRecorder deletions,
    ICurrentUser currentUser) : INetWorthService
{
    private const string AssetNotFound = "Asset not found.";
    private const string DebtNotFound = "Debt not found.";

    public async Task<IReadOnlyList<AssetResponse>> GetAssetsAsync(CancellationToken cancellationToken)
    {
        var assets = await db.Assets.OrderBy(a => a.CreatedAt).ToListAsync(cancellationToken);
        return assets.Select(a => a.ToResponse()).ToList();
    }

    public async Task<Result<AssetResponse>> CreateAssetAsync(
        CreateAssetRequest request,
        CancellationToken cancellationToken)
    {
        var asset = request.ToEntity(rates.ReportingCurrency);
        db.Assets.Add(asset);
        await db.SaveChangesAsync(cancellationToken);

        return asset.ToResponse();
    }

    public async Task<Result<AssetResponse>> UpdateAssetAsync(
        UpdateAssetRequest request,
        CancellationToken cancellationToken)
    {
        var assetId = new AssetId(request.Id);
        var updated = await db.UpdateOrNotFoundAsync<Asset>(a => a.Id == assetId, AssetNotFound, request.ApplyTo, cancellationToken);
        return updated.TryGetValue(out var asset) ? asset.ToResponse() : updated.Error;
    }

    public Task<Result<Guid>> DeleteAssetAsync(Guid id, CancellationToken cancellationToken)
    {
        var assetId = new AssetId(id);
        return db.DeleteOrNotFoundAsync<Asset>(
            id,
            a => a.Id == assetId,
            AssetNotFound,
            asset => deletions.Record(TrashKind.Asset, id, asset.Name),
            cancellationToken);
    }

    public async Task<IReadOnlyList<DebtResponse>> GetDebtsAsync(CancellationToken cancellationToken)
    {
        var debts = await db.Debts.OrderBy(d => d.CreatedAt).ToListAsync(cancellationToken);
        return debts.Select(d => d.ToResponse()).ToList();
    }

    public async Task<Result<DebtResponse>> CreateDebtAsync(
        CreateDebtRequest request,
        CancellationToken cancellationToken)
    {
        var debt = request.ToEntity(rates.ReportingCurrency);
        db.Debts.Add(debt);
        await db.SaveChangesAsync(cancellationToken);

        return debt.ToResponse();
    }

    public async Task<Result<DebtResponse>> UpdateDebtAsync(
        UpdateDebtRequest request,
        CancellationToken cancellationToken)
    {
        var debtId = new DebtId(request.Id);
        var updated = await db.UpdateOrNotFoundAsync<Debt>(d => d.Id == debtId, DebtNotFound, request.ApplyTo, cancellationToken);
        return updated.TryGetValue(out var debt) ? debt.ToResponse() : updated.Error;
    }

    public Task<Result<Guid>> DeleteDebtAsync(Guid id, CancellationToken cancellationToken)
    {
        var debtId = new DebtId(id);
        return db.DeleteOrNotFoundAsync<Debt>(
            id,
            d => d.Id == debtId,
            DebtNotFound,
            debt => deletions.Record(TrashKind.Debt, id, debt.Name),
            cancellationToken);
    }

    public async Task<Result<DebtScheduleResponse>> GetDebtScheduleAsync(Guid id, ExtraPayments extra, CancellationToken cancellationToken)
    {
        var debtId = new DebtId(id);
        var found = await db.Debts.AsNoTracking().FindOrNotFoundAsync(d => d.Id == debtId, DebtNotFound, cancellationToken);
        if (!found.TryGetValue(out var debt))
        {
            return found.Error;
        }

        if (AmortizationTerms.From(debt) is not { } terms)
        {
            return Result<DebtScheduleResponse>.Failure(
                ErrorCodes.DebtScheduleIncomplete,
                "The debt needs a loan amount, an interest rate, a first payment date, and a term or a monthly payment.");
        }

        if (!AmortizationCalculator.Calculate(terms).TryGetValue(out var plan))
        {
            return Result<DebtScheduleResponse>.Failure(ErrorCodes.DebtPaymentTooSmall, AmortizationCalculator.PaymentTooSmallMessage);
        }

        var withExtra = extra.IsNone ? null : AmortizationCalculator.Calculate(terms, extra).Value;
        var today = clock.Today;

        return new DebtScheduleResponse(
            id,
            today,
            terms.Principal,
            terms.AnnualRatePercent,
            terms.Type,
            plan.RegularPayment,
            plan.BalanceOn(today),
            plan.PaymentsMadeBy(today),
            ToPlan(plan),
            withExtra is null ? null : ToPlan(withExtra),
            withExtra is null ? null : plan.TotalInterest - withExtra.TotalInterest,
            withExtra is null ? null : plan.Rows.Count - withExtra.Rows.Count);
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
            netWorth,
            isComplete);
    }

    public async Task<NetWorthHistoryResponse> GetHistoryAsync(CancellationToken cancellationToken)
    {
        var snapshots = await db.NetWorthSnapshots
            .AsNoTracking()
            .OrderBy(s => s.Date)
            .ToListAsync(cancellationToken);

        var reporting = rates.ReportingCurrency;
        var foreign = snapshots.Where(s => s.Currency != reporting).ToList();
        var history = foreign.Count == 0
            ? null
            : await rates.GetHistoryAsync(foreign.Min(s => s.Date), foreign.Max(s => s.Date), cancellationToken);

        var items = new List<NetWorthSnapshotItem>();
        foreach (var snapshot in snapshots)
        {
            var table = snapshot.Currency == reporting ? null : history!.OnOrBefore(snapshot.Date);
            decimal? InReporting(decimal amount) => table is null ? amount : table.Convert(amount, snapshot.Currency, reporting);

            if (InReporting(snapshot.Accounts) is { } accounts
                && InReporting(snapshot.Assets) is { } assets
                && InReporting(snapshot.Debts) is { } debts
                && InReporting(snapshot.NetWorthValue) is { } netWorth)
            {
                items.Add(new NetWorthSnapshotItem(snapshot.Date, accounts, assets, debts, netWorth));
            }
        }

        return new NetWorthHistoryResponse(items);
    }

    private static DebtSchedulePlan ToPlan(AmortizationSchedule schedule) => new(
        schedule.PayoffDate,
        schedule.Rows.Count,
        schedule.TotalPaid,
        schedule.TotalInterest,
        schedule.TotalExtra,
        schedule.Rows
            .Select(row => new DebtScheduleRow(row.Number, row.Date, row.Payment, row.Interest, row.Principal, row.Extra, row.Balance))
            .ToList());

    private async Task<(decimal Accounts, decimal Assets, decimal Debts, decimal NetWorth, bool IsComplete)> ComputeTotalsAsync(
        CancellationToken cancellationToken)
    {
        var (accountsTotal, accountsComplete) = await accountService.GetReportingTotalAsync(cancellationToken);
        var assets = await db.Assets.AsNoTracking().ToListAsync(cancellationToken);
        var debts = await db.Debts.AsNoTracking().ToListAsync(cancellationToken);

        var (assetsTotal, assetsComplete) = await ToReportingAsync(assets.Select(a => a.CurrentValue), cancellationToken);
        var (debtsTotal, debtsComplete) = await ToReportingAsync(debts.Select(d => d.OutstandingAmount), cancellationToken);

        return (
            accountsTotal,
            assetsTotal,
            debtsTotal,
            accountsTotal + assetsTotal - debtsTotal,
            accountsComplete && assetsComplete && debtsComplete);
    }

    private async Task<(decimal Total, bool IsComplete)> ToReportingAsync(
        IEnumerable<Money> amounts,
        CancellationToken cancellationToken)
    {
        var (total, isComplete) = (0m, true);
        foreach (var currency in amounts.GroupBy(a => a.Currency))
        {
            var sum = new Money(currency.Sum(a => a.Amount), currency.Key);
            var converted = await rates.ToReportingAsync(sum, clock.Today, cancellationToken);
            isComplete &= converted.IsSuccess;
            total += converted.IsSuccess ? converted.Value : 0m;
        }

        return (total, isComplete);
    }

    private async Task UpsertTodaySnapshotAsync(
        decimal accountsTotal,
        decimal assetsTotal,
        decimal debtsTotal,
        decimal netWorth,
        CancellationToken cancellationToken)
    {
        var today = clock.Today;
        var snapshot = await db.NetWorthSnapshots.FirstOrDefaultAsync(s => s.Date == today, cancellationToken);
        if (snapshot is null)
        {
            snapshot = new NetWorthSnapshot { Date = today };
            db.NetWorthSnapshots.Add(snapshot);
        }

        snapshot.Currency = rates.ReportingCurrency;
        snapshot.Accounts = Money.Round(accountsTotal);
        snapshot.Assets = Money.Round(assetsTotal);
        snapshot.Debts = Money.Round(debtsTotal);
        snapshot.NetWorthValue = Money.Round(netWorth);

        await db.SaveChangesAsync(cancellationToken);
    }
}
