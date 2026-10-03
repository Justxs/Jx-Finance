using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Amortization;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.Sharing;
using JxFinance.Common.Trash;
using JxFinance.Domain.Common;
using JxFinance.Domain.Households;
using JxFinance.Domain.NetWorth;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Trash;
using JxFinance.Endpoints.NetWorth.CreateDebt;
using JxFinance.Endpoints.NetWorth.DeleteDebtBalance;
using JxFinance.Endpoints.NetWorth.GetDebtPaymentCandidates;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.LinkDebtPayment;
using JxFinance.Endpoints.NetWorth.Mappers;
using JxFinance.Endpoints.NetWorth.SetDebtBalance;
using JxFinance.Endpoints.NetWorth.Shared;
using JxFinance.Endpoints.NetWorth.UnlinkDebtPayment;
using JxFinance.Endpoints.NetWorth.UpdateDebt;
using JxFinance.Endpoints.NetWorth.UpdateDebtPayment;
using JxFinance.Endpoints.Transactions.Mappers;
using JxFinance.Endpoints.Transactions.Shared;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.NetWorth.Services;

[RegisterService<IDebtService>(LifeTime.Scoped)]
public sealed class DebtService(
    AppDbContext db,
    IExchangeRateService rates,
    IClock clock,
    IDeletionRecorder deletions,
    ICurrentUser currentUser,
    ISharingGuard sharing) : IDebtService
{
    private static readonly DomainError DebtNotFound = EntityLookup.NotFound("Debt not found.");
    private static readonly DomainError PaymentNotFound = EntityLookup.NotFound("That payment is not linked to this debt.");

    private static readonly DomainError PaidFromUnsharedAccount = new(
        ErrorCodes.HouseholdReferenceNotShared,
        "A shared debt can only be paid from an account shared with its household.");

    public async Task<IReadOnlyList<DebtResponse>> GetDebtsAsync(CancellationToken cancellationToken)
    {
        var debts = await db.Debts.AsNoTracking().OrderBy(d => d.CreatedAt).ToListAsync(cancellationToken);
        var tracked = await DebtTracker.TrackAsync(db, rates, debts, cancellationToken);
        return debts.Select(d => d.ToResponse(tracked.GetValueOrDefault(d.Id))).ToList();
    }

    public async Task<Result<DebtResponse>> CreateDebtAsync(
        CreateDebtRequest request,
        CancellationToken cancellationToken)
    {
        if (await sharing.CheckAsync(request, cancellationToken) is { } error)
        {
            return error;
        }

        var debt = request.ToEntity(rates.ReportingCurrency);
        db.Debts.Add(debt);
        await DebtBalanceBook.RecordAsync(db, debt, request.AsOf, request.OutstandingAmount!.Value, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        return await ToResponseAsync(debt, cancellationToken);
    }

    public async Task<Result<DebtResponse>> UpdateDebtAsync(
        UpdateDebtRequest request,
        CancellationToken cancellationToken)
    {
        var found = await FindDebtAsync(request.Id, cancellationToken);
        if (!found.TryGetValue(out var debt))
        {
            return found.Error;
        }

        var rechecksPayments = SharingState.From(request) != SharingState.Of(debt) || request.TracksPayments != debt.TracksPayments;
        var error = await sharing.CheckAsync(debt, request, cancellationToken)
            ?? (rechecksPayments ? await PaymentAccountsErrorAsync(debt, request, cancellationToken) : null);
        if (error is not null)
        {
            return error;
        }

        request.ApplyTo(debt);
        if (request.OutstandingAmount != debt.OutstandingAmount.Amount || request.AsOf != debt.AsOf)
        {
            await DebtBalanceBook.RecordAsync(db, debt, request.AsOf, request.OutstandingAmount!.Value, cancellationToken);
        }

        await db.SaveChangesAsync(cancellationToken);
        return await ToResponseAsync(debt, cancellationToken);
    }

    public async Task<Result<IReadOnlyList<DebtBalanceEntryResponse>>> GetDebtBalancesAsync(Guid id, CancellationToken cancellationToken)
    {
        var found = await FindDebtAsync(id, cancellationToken);
        if (!found.TryGetValue(out var debt))
        {
            return found.Error;
        }

        var entries = await db.DebtBalanceEntries
            .AsNoTracking()
            .Where(e => e.DebtId == debt.Id)
            .OrderByDescending(e => e.Date)
            .ToListAsync(cancellationToken);
        return entries.Select(e => e.ToResponse()).ToList();
    }

    public async Task<Result<DebtResponse>> SetDebtBalanceAsync(SetDebtBalanceRequest request, CancellationToken cancellationToken)
    {
        var found = await FindDebtAsync(request.Id, cancellationToken);
        if (!found.TryGetValue(out var debt))
        {
            return found.Error;
        }

        var entry = await DebtBalanceBook.RecordAsync(db, debt, request.Date, request.Amount!.Value, cancellationToken);
        entry.Note = OptionalText.Normalize(request.Note);
        if (await db.SaveOrConflictAsync(new DomainError(ErrorCodes.ConflictBusy, "Someone else recorded a balance for that date just now. Try again."), cancellationToken) is { } conflict)
        {
            return conflict;
        }

        return await ToResponseAsync(debt, cancellationToken);
    }

    public async Task<Result> DeleteDebtBalanceAsync(DeleteDebtBalanceRequest request, CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await db.Database.LockAsync(request.Id, cancellationToken);
        var found = await FindDebtAsync(request.Id, cancellationToken);
        if (!found.TryGetValue(out var debt))
        {
            return found.Error;
        }

        var stored = await db.DebtBalanceEntries.FindOrNotFoundAsync(
            e => e.DebtId == debt.Id && e.Date == request.Date,
            EntityLookup.NotFound("No balance is recorded for that date."),
            cancellationToken);
        if (!stored.TryGetValue(out var entry))
        {
            return stored.Error;
        }

        var removed = await DebtBalanceBook.RemoveAsync(db, debt, entry, cancellationToken);
        if (removed.IsSuccess)
        {
            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }

        return removed;
    }

    public Task<Result<Guid>> DeleteDebtAsync(Guid id, CancellationToken cancellationToken)
    {
        var debtId = new DebtId(id);
        return db.DeleteOrNotFoundAsync<Debt>(
            id,
            d => d.Id == debtId,
            DebtNotFound,
            debt => OwnerDeletion.CheckAsync(debt, currentUser.Id, deletions, TrashKind.Debt, id, debt.Name, "Only the owner can delete a shared debt."),
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
        var keepingTerm = extra.IsNone ? null : AmortizationCalculator.CalculateKeepingTerm(terms, extra).Value;
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
            withExtra is null ? null : plan.Rows.Count - withExtra.Rows.Count,
            keepingTerm is null ? null : ToLowerPayment(plan, keepingTerm));
    }

    public async Task<Result<IReadOnlyList<DebtPaymentResponse>>> GetDebtPaymentsAsync(Guid id, CancellationToken cancellationToken)
    {
        var found = await FindDebtAsync(id, cancellationToken);
        if (!found.TryGetValue(out var debt))
        {
            return found.Error;
        }

        var tracking = (await DebtTracker.TrackAsync(db, rates, [debt], cancellationToken)).GetValueOrDefault(debt.Id);
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

        if (SharedHousehold(debt) is { } household
            && !await db.Accounts.AnyAsync(a => a.Id == transaction.AccountId && a.Scope == Scope.Shared && a.HouseholdId == household, cancellationToken))
        {
            return PaidFromUnsharedAccount;
        }

        await db.DebtPayments
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .Where(p => p.TransactionId == transactionId && !db.Debts.Any(d => d.Id == p.DebtId))
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
        var link = await db.DebtPayments.FindOrNotFoundAsync(p => p.Id == paymentId && p.DebtId == debt.Id, PaymentNotFound, cancellationToken);
        if (!link.TryGetValue(out var payment))
        {
            return link.Error;
        }

        db.DebtPayments.Remove(payment);
        await db.SaveChangesAsync(cancellationToken);
        return Result.Success();
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
        var household = SharedHousehold(debt);
        var candidates = await db.Transactions
            .AsNoTracking()
            .Where(t => t.Type == FlowType.Expense && !t.IsSplit && t.Amount.Amount > 0 && t.Date >= from && !db.DebtPayments.Any(p => p.TransactionId == t.Id))
            .Where(t => household == null || db.Accounts.Any(a => a.Id == t.AccountId && a.Scope == Scope.Shared && a.HouseholdId == household))
            .OrderByDescending(t => t.Date)
            .Take(200)
            .ToListAsync(cancellationToken);

        int Score(Transaction t) =>
            (known.Contains(t.Description, StringComparer.OrdinalIgnoreCase) ? 2 : 0)
            + (regular is { } amount && t.Amount.Currency == debt.Currency && Math.Abs(t.Amount.Amount - amount) <= amount * 0.05m ? 1 : 0);

        return candidates.OrderByDescending(Score).Take(50).Select(t => t.ToResponse(null).WithoutUnusual().WithoutPlace()).ToList();
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

    private static DebtLowerPayment ToLowerPayment(AmortizationSchedule plan, AmortizationSchedule keepingTerm)
    {
        var lowered = keepingTerm.Rows.SkipWhile(row => row.Extra == 0).Skip(1).FirstOrDefault();
        return new DebtLowerPayment(
            keepingTerm.PayoffDate,
            keepingTerm.TotalInterest,
            plan.TotalInterest - keepingTerm.TotalInterest,
            lowered?.Date,
            lowered?.Payment,
            lowered is null ? null : plan.Rows[lowered.Number - 1].Payment);
    }

    private Task<Result<Debt>> FindDebtAsync(Guid id, CancellationToken cancellationToken)
    {
        var debtId = new DebtId(id);
        return db.Debts.FindOrNotFoundAsync(d => d.Id == debtId, DebtNotFound, cancellationToken);
    }

    private async Task<DebtResponse> ToResponseAsync(Debt debt, CancellationToken cancellationToken) =>
        debt.ToResponse((await DebtTracker.TrackAsync(db, rates, [debt], cancellationToken)).GetValueOrDefault(debt.Id));

    private static HouseholdId? SharedHousehold(Debt debt) => debt.Scope == Scope.Shared ? debt.HouseholdId : null;

    private async Task<DomainError?> PaymentAccountsErrorAsync(Debt debt, IDebtInput input, CancellationToken cancellationToken)
    {
        var accounts = await db.Transactions
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .Where(t => db.DebtPayments.Any(p => p.DebtId == debt.Id && p.TransactionId == t.Id))
            .Select(t => t.AccountId)
            .Distinct()
            .ToListAsync(cancellationToken);
        return await sharing.CheckReferencesAsync(input, new SharedReferences(accounts, [], []), cancellationToken);
    }
}
