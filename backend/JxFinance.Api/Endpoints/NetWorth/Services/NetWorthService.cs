using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Amortization;
using JxFinance.Common.Assets;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.Trash;
using JxFinance.Common.Validation;
using JxFinance.Domain.Common;
using JxFinance.Domain.NetWorth;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Trash;
using JxFinance.Endpoints.Accounts.Interfaces;
using JxFinance.Endpoints.NetWorth.CreateAsset;
using JxFinance.Endpoints.NetWorth.CreateDebt;
using JxFinance.Endpoints.NetWorth.DeleteAssetValuation;
using JxFinance.Endpoints.NetWorth.GetAssetValueHistory;
using JxFinance.Endpoints.NetWorth.GetDebtPaymentCandidates;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.LinkDebtPayment;
using JxFinance.Endpoints.NetWorth.Mappers;
using JxFinance.Endpoints.NetWorth.SetAssetValuation;
using JxFinance.Endpoints.NetWorth.Shared;
using JxFinance.Endpoints.NetWorth.UnlinkDebtPayment;
using JxFinance.Endpoints.NetWorth.UpdateAsset;
using JxFinance.Endpoints.NetWorth.UpdateDebt;
using JxFinance.Endpoints.NetWorth.UpdateDebtPayment;
using JxFinance.Endpoints.Transactions.Mappers;
using JxFinance.Endpoints.Transactions.Shared;
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
    private static readonly DomainError AssetNotFound = EntityLookup.NotFound("Asset not found.");
    private static readonly DomainError DebtNotFound = EntityLookup.NotFound("Debt not found.");
    private static readonly DomainError PaymentNotFound = EntityLookup.NotFound("That payment is not linked to this debt.");

    public async Task<IReadOnlyList<AssetResponse>> GetAssetsAsync(CancellationToken cancellationToken)
    {
        var assets = await db.Assets.AsNoTracking().OrderBy(a => a.CreatedAt).ToListAsync(cancellationToken);
        var valuations = await ValuationsOfAsync(assets, cancellationToken);
        return assets.Select(a => a.ToResponse(valuations[a.Id].ToList(), clock.Today)).ToList();
    }

    public async Task<Result<AssetResponse>> CreateAssetAsync(
        CreateAssetRequest request,
        CancellationToken cancellationToken)
    {
        var asset = request.ToEntity(rates.ReportingCurrency);
        db.Assets.Add(asset);
        await AssetValuationBook.RecordAsync(db, asset, request.AsOf, request.CurrentValue!.Value, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        return await ToResponseAsync(asset, cancellationToken);
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

        request.ApplyTo(asset);
        if (request.CurrentValue != asset.CurrentValue.Amount || request.AsOf != asset.AsOf)
        {
            await AssetValuationBook.RecordAsync(db, asset, request.AsOf, request.CurrentValue!.Value, cancellationToken);
        }

        await db.SaveChangesAsync(cancellationToken);
        return await ToResponseAsync(asset, cancellationToken);
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

        return await ToResponseAsync(asset, cancellationToken);
    }

    public async Task<Result> DeleteValuationAsync(DeleteAssetValuationRequest request, CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await db.Database.LockAsync(currentUser.Id, cancellationToken);
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
            asset => deletions.Record(TrashKind.Asset, id, asset.Name),
            cancellationToken);
    }

    public async Task<IReadOnlyList<DebtResponse>> GetDebtsAsync(CancellationToken cancellationToken)
    {
        var debts = await db.Debts.AsNoTracking().OrderBy(d => d.CreatedAt).ToListAsync(cancellationToken);
        var tracked = await TrackAsync(debts, cancellationToken);
        return debts.Select(d => d.ToResponse(tracked.GetValueOrDefault(d.Id))).ToList();
    }

    public async Task<Result<DebtResponse>> CreateDebtAsync(
        CreateDebtRequest request,
        CancellationToken cancellationToken)
    {
        var debt = request.ToEntity(rates.ReportingCurrency);
        db.Debts.Add(debt);
        await db.SaveChangesAsync(cancellationToken);

        return await ToResponseAsync(debt, cancellationToken);
    }

    public async Task<Result<DebtResponse>> UpdateDebtAsync(
        UpdateDebtRequest request,
        CancellationToken cancellationToken)
    {
        var debtId = new DebtId(request.Id);
        var updated = await db.UpdateOrNotFoundAsync<Debt>(d => d.Id == debtId, DebtNotFound, request.ApplyTo, cancellationToken);
        return updated.TryGetValue(out var debt) ? await ToResponseAsync(debt, cancellationToken) : updated.Error;
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

    public async Task<Result<IReadOnlyList<DebtPaymentResponse>>> GetDebtPaymentsAsync(Guid id, CancellationToken cancellationToken)
    {
        var found = await FindDebtAsync(id, cancellationToken);
        if (!found.TryGetValue(out var debt))
        {
            return found.Error;
        }

        var tracking = (await TrackAsync([debt], cancellationToken)).GetValueOrDefault(debt.Id);
        return (tracking?.Track.Rows ?? []).Select(row =>
        {
            var transaction = tracking!.Transactions[row.Payment.Id];
            return new DebtPaymentResponse(
                row.Payment.Id,
                transaction.Id.Value,
                row.Payment.Date,
                transaction.AccountId.Value,
                transaction.Description,
                row.Payment.Amount,
                row.Payment.Kind,
                row.Interest,
                row.Principal,
                row.Payment.Principal is not null,
                row.Overpaid,
                row.Balance);
        }).ToList();
    }

    public async Task<Result<DebtResponse>> LinkDebtPaymentAsync(LinkDebtPaymentRequest request, CancellationToken cancellationToken)
    {
        var found = await FindDebtAsync(request.Id, cancellationToken);
        if (!found.TryGetValue(out var debt))
        {
            return found.Error;
        }

        if (!debt.TracksPayments)
        {
            return new DomainError(ErrorCodes.DebtNotTracked, "Turn on payment tracking for this debt first.");
        }

        var transactionId = new TransactionId(request.TransactionId);
        var transaction = await db.Transactions.AsNoTracking().FirstOrDefaultAsync(t => t.Id == transactionId, cancellationToken);
        if (transaction is null)
        {
            return new DomainError(ErrorCodes.ReferenceNotFound, "Transaction does not exist.");
        }

        if (transaction.Type != FlowType.Expense || transaction.Amount.Amount <= 0)
        {
            return new DomainError(ErrorCodes.DebtPaymentWrongType, "Only an expense, not a refund, can pay a debt.");
        }

        if (transaction.IsSplit)
        {
            return new DomainError(ErrorCodes.TransactionSplitNotAllowed, "A split transaction cannot pay a debt.");
        }

        await db.DebtPayments
            .Where(p => p.TransactionId == transactionId && !LiveDebtPayments().Any(live => live.Id == p.Id))
            .ExecuteDeleteAsync(cancellationToken);
        var month = transaction.Date;
        var regularThatMonth = await db.DebtPayments.AnyAsync(
            p => p.DebtId == debt.Id && p.Kind == DebtPaymentKind.Regular
                && db.Transactions.Any(t => t.Id == p.TransactionId && t.Date.Year == month.Year && t.Date.Month == month.Month),
            cancellationToken);
        db.DebtPayments.Add(new DebtPayment
        {
            DebtId = debt.Id,
            TransactionId = transactionId,
            Kind = request.Kind ?? (regularThatMonth ? DebtPaymentKind.Extra : DebtPaymentKind.Regular),
            Principal = request.Principal,
        });
        if (await db.SaveOrConflictAsync(new DomainError(ErrorCodes.DebtPaymentTaken, "This transaction already pays a debt."), cancellationToken) is { } conflict)
        {
            return conflict;
        }

        return await ToResponseAsync(debt, cancellationToken);
    }

    public async Task<Result<DebtResponse>> UpdateDebtPaymentAsync(UpdateDebtPaymentRequest request, CancellationToken cancellationToken)
    {
        var found = await FindDebtAsync(request.Id, cancellationToken);
        if (!found.TryGetValue(out var debt))
        {
            return found.Error;
        }

        var paymentId = new DebtPaymentId(request.PaymentId);
        var link = await db.DebtPayments.FindOrNotFoundAsync(p => p.Id == paymentId && p.DebtId == debt.Id, PaymentNotFound, cancellationToken);
        if (!link.TryGetValue(out var payment))
        {
            return link.Error;
        }

        payment.Kind = request.Kind;
        payment.Principal = request.Principal;
        await db.SaveChangesAsync(cancellationToken);
        return await ToResponseAsync(debt, cancellationToken);
    }

    public async Task<Result> UnlinkDebtPaymentAsync(UnlinkDebtPaymentRequest request, CancellationToken cancellationToken)
    {
        var found = await FindDebtAsync(request.Id, cancellationToken);
        if (!found.TryGetValue(out var debt))
        {
            return found.Error;
        }

        var paymentId = new DebtPaymentId(request.PaymentId);
        var removed = await db.DebtPayments.Where(p => p.Id == paymentId && p.DebtId == debt.Id).ExecuteDeleteAsync(cancellationToken);
        return removed == 1 ? Result.Success() : PaymentNotFound;
    }

    public async Task<Result<IReadOnlyList<TransactionResponse>>> GetDebtPaymentCandidatesAsync(
        GetDebtPaymentCandidatesRequest request,
        CancellationToken cancellationToken)
    {
        var found = await FindDebtAsync(request.Id, cancellationToken);
        if (!found.TryGetValue(out var debt))
        {
            return found.Error;
        }

        var from = request.From ?? debt.AsOf.AddDays(1);
        var known = await db.RecurringBills.Where(b => b.DebtId == debt.Id).Select(b => b.Name).ToListAsync(cancellationToken);
        known.AddRange(await db.Transactions
            .Where(t => t.Description != null && db.DebtPayments.Any(p => p.DebtId == debt.Id && p.TransactionId == t.Id))
            .Select(t => t.Description!)
            .ToListAsync(cancellationToken));
        var regular = AmortizationTerms.From(debt) is { } terms && AmortizationCalculator.Calculate(terms).TryGetValue(out var plan)
            ? plan.RegularPayment
            : debt.MonthlyPayment;
        var candidates = await db.Transactions
            .AsNoTracking()
            .Where(t => t.Type == FlowType.Expense && !t.IsSplit && t.Amount.Amount > 0 && t.Date >= from && !LiveDebtPayments().Any(p => p.TransactionId == t.Id))
            .OrderByDescending(t => t.Date)
            .Take(200)
            .ToListAsync(cancellationToken);

        int Score(Transaction t) =>
            (known.Contains(t.Description, StringComparer.OrdinalIgnoreCase) ? 2 : 0)
            + (regular is { } amount && t.Amount.Currency == debt.Currency && Math.Abs(t.Amount.Amount - amount) <= amount * 0.05m ? 1 : 0);

        return candidates.OrderByDescending(Score).Take(50).Select(t => t.ToResponse(null).WithoutUnusual()).ToList();
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

    private Task<Result<Asset>> FindAssetAsync(Guid id, CancellationToken cancellationToken)
    {
        var assetId = new AssetId(id);
        return db.Assets.FindOrNotFoundAsync(a => a.Id == assetId, AssetNotFound, cancellationToken);
    }

    private async Task<ILookup<AssetId, AssetValuation>> ValuationsOfAsync(List<Asset> assets, CancellationToken cancellationToken)
    {
        var ids = assets.Select(a => a.Id).ToList();
        var valuations = await db.AssetValuations.AsNoTracking().Where(v => ids.Contains(v.AssetId)).ToListAsync(cancellationToken);
        return valuations.ToLookup(v => v.AssetId);
    }

    private async Task<AssetResponse> ToResponseAsync(Asset asset, CancellationToken cancellationToken) =>
        asset.ToResponse((await ValuationsOfAsync([asset], cancellationToken))[asset.Id].ToList(), clock.Today);

    private Task<Result<Debt>> FindDebtAsync(Guid id, CancellationToken cancellationToken)
    {
        var debtId = new DebtId(id);
        return db.Debts.FindOrNotFoundAsync(d => d.Id == debtId, DebtNotFound, cancellationToken);
    }

    private async Task<DebtResponse> ToResponseAsync(Debt debt, CancellationToken cancellationToken) =>
        debt.ToResponse((await TrackAsync([debt], cancellationToken)).GetValueOrDefault(debt.Id));

    private static bool PaysDebt(Transaction? transaction) => transaction is { Type: FlowType.Expense, IsSplit: false, Amount.Amount: > 0 };

    private IQueryable<DebtPayment> LiveDebtPayments() =>
        db.DebtPayments.Where(p => db.Debts.Any(d => d.Id == p.DebtId));

    private async Task<Dictionary<DebtId, DebtTracking>> TrackAsync(IReadOnlyCollection<Debt> debts, CancellationToken cancellationToken)
    {
        var tracking = debts.Where(d => d.TracksPayments).ToList();
        if (tracking.Count == 0)
        {
            return [];
        }

        var ids = tracking.Select(d => d.Id).ToList();
        var links = await db.DebtPayments.AsNoTracking()
            .Where(p => ids.Contains(p.DebtId))
            .LeftJoin(db.Transactions.AsNoTracking(), p => p.TransactionId, t => t.Id, (payment, transaction) => new { Link = payment, Transaction = transaction })
            .OrderBy(l => l.Link.CreatedAt)
            .ToListAsync(cancellationToken);
        var foreign = links
            .Where(l => l.Transaction is not null && l.Transaction.Amount.Currency != tracking.First(d => d.Id == l.Link.DebtId).Currency)
            .Select(l => l.Transaction!.Date)
            .ToList();
        var history = foreign.Count == 0 ? null : await rates.GetHistoryAsync(foreign.Min(), foreign.Max(), cancellationToken);

        return tracking.ToDictionary(debt => debt.Id, debt =>
        {
            var mine = links.Where(l => l.Link.DebtId == debt.Id).ToList();
            var visible = mine.Where(l => PaysDebt(l.Transaction)).ToDictionary(l => l.Link.Id.Value, l => l.Transaction!);
            var payments = new List<TrackedPayment>();
            var incomplete = false;
            foreach (var link in mine.Where(l => PaysDebt(l.Transaction)))
            {
                var paid = link.Transaction!.Amount;
                var amount = paid.Currency == debt.Currency ? paid.Amount : history!.OnOrBefore(link.Transaction.Date).Convert(paid.Amount, paid.Currency, debt.Currency);
                if (amount is { } value)
                {
                    payments.Add(new TrackedPayment(link.Link.Id.Value, link.Transaction.Date, Money.Round(value), link.Link.Kind, link.Link.Principal));
                }
                else
                {
                    incomplete |= link.Transaction.Date > debt.AsOf;
                }
            }

            var track = DebtBalance.Track(debt.OutstandingAmount.Amount, debt.AsOf, debt.InterestRate, payments);
            return new DebtTracking(track, incomplete, mine.Count - visible.Count, visible);
        });
    }

    private async Task<(decimal Accounts, decimal Assets, decimal Debts, decimal NetWorth, bool IsComplete)> ComputeTotalsAsync(
        CancellationToken cancellationToken)
    {
        var (accountsTotal, accountsComplete) = await accountService.GetReportingTotalAsync(null, cancellationToken);
        var assets = await db.Assets.AsNoTracking().ToListAsync(cancellationToken);
        var debts = await db.Debts.AsNoTracking().ToListAsync(cancellationToken);
        var valuations = await ValuationsOfAsync(assets, cancellationToken);
        var assetValues = assets.Select(a => new Money(AssetValue.On(clock.Today, valuations[a.Id], a.Depreciation) ?? 0m, a.Currency));

        var (assetsTotal, assetsComplete) = await ToReportingAsync(assetValues, cancellationToken);
        var tracked = await TrackAsync(debts, cancellationToken);
        var debtBalances = debts.Select(d => tracked.TryGetValue(d.Id, out var t) ? new Money(t.Track.Balance, d.Currency) : d.OutstandingAmount);
        var (debtsTotal, debtsComplete) = await ToReportingAsync(debtBalances, cancellationToken);

        return (
            accountsTotal,
            assetsTotal,
            debtsTotal,
            accountsTotal + assetsTotal - debtsTotal,
            accountsComplete && assetsComplete && debtsComplete && !tracked.Values.Any(t => t.Incomplete));
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
