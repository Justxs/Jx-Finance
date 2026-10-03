using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Assets;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.Settings;
using JxFinance.Common.Validation;
using JxFinance.Domain.Common;
using JxFinance.Domain.NetWorth;
using JxFinance.Domain.Settings;
using JxFinance.Endpoints.Accounts.Interfaces;
using JxFinance.Endpoints.Contacts.Interfaces;
using JxFinance.Endpoints.Households.Interfaces;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.Shared;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.NetWorth.Services;

[RegisterService<INetWorthService>(LifeTime.Scoped)]
public sealed class NetWorthService(
    AppDbContext db,
    IAccountService accountService,
    IExchangeRateService rates,
    IClock clock,
    ICurrentUser currentUser,
    INetWorthSnapshotter snapshotter,
    ISettleUpService settleUp,
    IContactService contacts,
    IInstanceSettingsStore settings) : INetWorthService
{
    public async Task<NetWorthResponse> GetCurrentAsync(CancellationToken cancellationToken)
    {
        if (currentUser.ActiveHouseholdId is not null)
        {
            var narrowed = await ComputeTotalsAsync(cancellationToken);
            await snapshotter.SnapshotAsync(currentUser.Id, cancellationToken);
            return narrowed;
        }

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await db.Database.LockAsync(currentUser.Id, cancellationToken);
        var totals = await ComputeTotalsAsync(cancellationToken);
        var fitsSnapshot = new[] { totals.Accounts, totals.Assets, totals.Debts, totals.NetWorth }.All(total => DecimalRules.FitsMoney(Money.Round(total)));
        if (totals.IsComplete && fitsSnapshot)
        {
            await UpsertTodaySnapshotAsync(totals.Accounts, totals.Assets, totals.Debts, totals.NetWorth, cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);

        return totals;
    }

    public async Task<NetWorthResponse> CountOpenBalancesAsync(bool count, CancellationToken cancellationToken)
    {
        await db.Users
            .Where(u => u.Id == currentUser.Id)
            .ExecuteUpdateAsync(setters => setters.SetProperty(u => u.CountOpenBalancesInNetWorth, count), cancellationToken);
        return await GetCurrentAsync(cancellationToken);
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

    private async Task<NetWorthResponse> ComputeTotalsAsync(CancellationToken cancellationToken)
    {
        var (accountsTotal, accountsComplete) = await accountService.GetReportingTotalAsync(null, cancellationToken);
        var assets = await db.Assets.AsNoTracking().ToListAsync(cancellationToken);
        var debts = await db.Debts.AsNoTracking().ToListAsync(cancellationToken);
        var assetValues = assets.Select(a => new Money(AssetValue.On(clock.Today, [a.Newest], a.Depreciation) ?? 0m, a.Currency));

        var (assetsTotal, assetsComplete) = await ToReportingAsync(assetValues, cancellationToken);
        var tracked = await DebtTracker.TrackAsync(db, rates, debts, cancellationToken);
        var debtBalances = debts.Select(d => tracked.TryGetValue(d.Id, out var t) ? new Money(t.Track.Balance, d.Currency) : d.OutstandingAmount);
        var (debtsTotal, debtsComplete) = await ToReportingAsync(debtBalances, cancellationToken);

        var counted = settings.Current.IsEnabled(Feature.Households)
            && await db.Users.Where(u => u.Id == currentUser.Id).Select(u => u.CountOpenBalancesInNetWorth).FirstOrDefaultAsync(cancellationToken);
        var open = counted ? await OpenBalancesAsync(cancellationToken) : [];
        var (receivable, receivableComplete) = await ToReportingAsync(open.Where(b => b.Amount > 0), cancellationToken);
        var (payable, payableComplete) = await ToReportingAsync(
            open.Where(b => b.Amount < 0).Select(b => new Money(-b.Amount, b.Currency)),
            cancellationToken);

        return new NetWorthResponse(
            accountsTotal,
            assetsTotal + receivable,
            debtsTotal + payable,
            accountsTotal + assetsTotal + receivable - debtsTotal - payable,
            accountsComplete && assetsComplete && debtsComplete && receivableComplete && payableComplete
                && !tracked.Values.Any(t => t.Incomplete),
            counted,
            receivable,
            payable);
    }

    private async Task<List<Money>> OpenBalancesAsync(CancellationToken cancellationToken)
    {
        var balances = new List<Money>();
        foreach (var household in await db.Households.Select(h => h.Id).ToListAsync(cancellationToken))
        {
            if ((await settleUp.GetBalancesAsync(household.Value, cancellationToken)).TryGetValue(out var settled))
            {
                balances.AddRange(settled.Balances
                    .Where(b => b.UserId == currentUser.Id)
                    .Select(b => new Money(b.Amount, b.Currency)));
            }
        }

        if (settings.Current.IsEnabled(Feature.People))
        {
            balances.AddRange((await contacts.GetAllAsync(cancellationToken))
                .SelectMany(c => c.Balances)
                .Select(b => new Money(b.Amount, b.Currency)));
        }

        return balances;
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
