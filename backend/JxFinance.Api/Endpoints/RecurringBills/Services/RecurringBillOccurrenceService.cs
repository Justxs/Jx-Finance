using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.References;
using JxFinance.Common.Settings;
using JxFinance.Common.Validation;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.NetWorth;
using JxFinance.Domain.Notifications;
using JxFinance.Domain.RecurringBills;
using JxFinance.Domain.Settings;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.RecurringBills.ConfirmRecurringBill;
using JxFinance.Endpoints.RecurringBills.Interfaces;
using JxFinance.Endpoints.RecurringBills.Shared;
using JxFinance.Endpoints.RecurringBills.SkipRecurringBill;
using JxFinance.Endpoints.Transfers.CreateTransfer;
using JxFinance.Endpoints.Transfers.Interfaces;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.RecurringBills.Services;

[RegisterService<IRecurringBillOccurrenceService>(LifeTime.Scoped)]
public sealed class RecurringBillOccurrenceService(
    AppDbContext db,
    ITransactionValuation valuations,
    IReferenceGuard references,
    ITransferService transfers,
    IInstanceSettingsStore settings,
    IClock clock) : IRecurringBillOccurrenceService
{
    private readonly RecurringBillLookup lookup = new(db, settings, clock);

    private static readonly DomainError CategoryGone =
        new(ErrorCodes.ReferenceNotFound, "The category of this recurring entry is no longer available.");

    public async Task<Result<ConfirmRecurringBillResponse>> ConfirmAsync(
        ConfirmRecurringBillRequest request,
        CancellationToken cancellationToken)
    {
        await using var dbTransaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var due = await LockDueAsync(request.Id, request.ExpectedDueDate, cancellationToken);
        if (!due.TryGetValue(out var bill))
        {
            return due.Error;
        }

        var amount = ResolveAmount(bill, request);
        if (amount.IsFailure)
        {
            return amount.Error;
        }

        Guid? transactionId = null;
        Guid? transferId = null;
        if (bill.Shape == RecurringBillShape.Transfer)
        {
            var posted = await PostTransferAsync(bill, request, amount.Value, cancellationToken);
            if (posted.IsFailure) return posted.Error;
            transferId = posted.Value;
        }
        else
        {
            var posted = await PostTransactionAsync(bill, request, amount.Value, cancellationToken);
            if (posted.IsFailure) return posted.Error;
            transactionId = posted.Value;
            var paidFrom = request.AccountId is { } chosen ? new AccountId(chosen) : bill.AccountId;
            await LinkDebtPaymentAsync(bill, new TransactionId(posted.Value), paidFrom, cancellationToken);
        }

        await AdvanceAsync(bill, cancellationToken);
        await dbTransaction.CommitAsync(cancellationToken);
        return new ConfirmRecurringBillResponse(await lookup.ResponseAsync(bill, cancellationToken), transactionId, transferId);
    }

    public async Task<Result<RecurringBillResponse>> SkipAsync(
        SkipRecurringBillRequest request,
        CancellationToken cancellationToken)
    {
        await using var dbTransaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var due = await LockDueAsync(request.Id, request.ExpectedDueDate, cancellationToken);
        if (!due.TryGetValue(out var bill))
        {
            return due.Error;
        }

        if (bill.DebtId is not null && request.TransactionId is { } matched)
        {
            var rowId = new TransactionId(matched);
            var paidFrom = await db.Transactions
                .Where(t => t.Id == rowId && t.Type == FlowType.Expense && !t.IsSplit && t.Amount.Amount > 0)
                .Select(t => (AccountId?)t.AccountId)
                .FirstOrDefaultAsync(cancellationToken);
            if (paidFrom is not null
                && !await db.DebtPayments.IgnoreQueryFilters(QueryFilters.OwnerOnly).AnyAsync(p => p.TransactionId == rowId, cancellationToken))
            {
                await LinkDebtPaymentAsync(bill, rowId, paidFrom, cancellationToken);
            }
        }

        await AdvanceAsync(bill, cancellationToken);
        await dbTransaction.CommitAsync(cancellationToken);
        return await lookup.ResponseAsync(bill, cancellationToken);
    }

    private async Task<Result<RecurringBill>> LockDueAsync(Guid id, DateOnly expectedDueDate, CancellationToken cancellationToken)
    {
        await db.Database.LockAsync(id, cancellationToken);
        if (await lookup.FindAsync(id, cancellationToken) is not { } bill)
        {
            return RecurringBillLookup.NotFound;
        }

        if (!bill.IsActive)
            return new DomainError(ErrorCodes.RecurringBillInactive, "This recurring entry is inactive.");
        if (expectedDueDate != bill.NextDueDate)
            return new DomainError(ErrorCodes.ConflictStale, "This occurrence has changed or was already confirmed. Refresh the entry.");

        return bill;
    }

    private async Task LinkDebtPaymentAsync(
        RecurringBill bill,
        TransactionId transactionId,
        AccountId? paidFrom,
        CancellationToken cancellationToken)
    {
        if (bill.DebtId is { } debtId && settings.Current.IsEnabled(Feature.NetWorth)
            && await db.Debts.AnyAsync(
                d => d.Id == debtId
                    && d.TracksPayments
                    && (d.Scope == Scope.Personal
                        || db.Accounts.Any(a => a.Id == paidFrom && a.Scope == Scope.Shared && a.HouseholdId == d.HouseholdId)),
                cancellationToken))
        {
            db.DebtPayments.Add(new DebtPayment { DebtId = debtId, TransactionId = transactionId, Kind = DebtPaymentKind.Regular });
        }
    }

    private async Task AdvanceAsync(RecurringBill bill, CancellationToken cancellationToken)
    {
        bill.Advance();
        await db.Notifications.Where(n => n.RelatedType == NotificationRelated.RecurringBill && n.RelatedId == bill.Id.Value && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true), cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
    }

    private static Result<decimal> ResolveAmount(RecurringBill bill, ConfirmRecurringBillRequest request)
    {
        if (bill.Kind == RecurringBillKind.Fixed)
        {
            return bill.Amount!.Value;
        }

        if (request.Amount is not { } confirmed || confirmed <= 0 || !DecimalRules.FitsMoney(confirmed))
        {
            return new DomainError(
                ErrorCodes.MoneyPositive,
                "A variable recurring entry needs an amount to confirm.");
        }

        return confirmed;
    }

    private async Task<Result<Guid>> PostTransactionAsync(
        RecurringBill bill,
        ConfirmRecurringBillRequest request,
        decimal amount,
        CancellationToken cancellationToken)
    {
        var accountId = request.AccountId is { } requestAccountId ? new AccountId(requestAccountId) : bill.AccountId;
        if (accountId is null)
        {
            return new DomainError(
                ErrorCodes.Required,
                "An account is required to confirm this recurring entry.");
        }

        var flow = RecurringBillLookup.FlowOf(bill.Shape);
        var referenceError = await references.AccountExistsAsync(accountId.Value, cancellationToken);
        if (referenceError is null && bill.CategoryId is { } categoryId)
        {
            referenceError = await references.CategoryOfTypeAsync(categoryId, flow, CategoryGone, cancellationToken);
        }

        if (referenceError is not null)
        {
            return referenceError;
        }

        var value = await valuations.ValueAsync(accountId.Value, amount, null, bill.NextDueDate, [], cancellationToken);
        if (!value.TryGetValue(out var valued))
        {
            return value.Error;
        }

        var transaction = new Transaction
        {
            AccountId = accountId.Value,
            CategoryId = bill.CategoryId,
            Type = flow,
            Amount = valued.Amount,
            ReportingAmount = valued.ReportingAmount,
            Date = bill.NextDueDate,
            Description = bill.Name,
            Source = TransactionSource.Manual,
            SpreadMonths = bill.SpreadMonths,
            SpreadDirection = bill.SpreadDirection,
        };
        db.Transactions.Add(transaction);

        return transaction.Id.Value;
    }

    private async Task<Result<Guid>> PostTransferAsync(
        RecurringBill bill,
        ConfirmRecurringBillRequest request,
        decimal amount,
        CancellationToken cancellationToken)
    {
        if (bill.AccountId is not { } fromAccountId || bill.ToAccountId is not { } toAccountId)
        {
            return new DomainError(
                ErrorCodes.Required,
                "Both accounts are required to confirm this recurring transfer.");
        }

        var created = await transfers.CreateAsync(
            new CreateTransferRequest(
                fromAccountId.Value,
                toAccountId.Value,
                amount,
                bill.NextDueDate,
                bill.Name,
                ReceivedAmount: request.ReceivedAmount),
            cancellationToken);

        return created.Map(transfer => transfer.Id);
    }
}
