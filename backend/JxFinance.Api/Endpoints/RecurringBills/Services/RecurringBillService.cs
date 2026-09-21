using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.References;
using JxFinance.Common.Trash;
using JxFinance.Common.Validation;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.RecurringBills;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Trash;
using JxFinance.Endpoints.RecurringBills.ConfirmRecurringBill;
using JxFinance.Endpoints.RecurringBills.Interfaces;
using JxFinance.Endpoints.RecurringBills.Shared;
using JxFinance.Endpoints.Transfers.CreateTransfer;
using JxFinance.Endpoints.Transfers.Interfaces;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.RecurringBills.Services;

[RegisterService<IRecurringBillService>(LifeTime.Scoped)]
public sealed class RecurringBillService(
    AppDbContext db,
    IExchangeRateService rates,
    IReferenceGuard references,
    IDeletionRecorder deletions,
    ITransferService transfers) : IRecurringBillService
{
    private static readonly DomainError CategoryGone =
        new(ErrorCodes.ReferenceNotFound, "The category of this recurring entry is no longer available.");

    private static readonly DomainError CategoryNotExpense =
        new(ErrorCodes.CategoryWrongType, "Choose an accessible expense category.");

    private static readonly DomainError CategoryNotIncome =
        new(ErrorCodes.CategoryWrongType, "Choose an accessible income category.");

    public async Task<IReadOnlyList<RecurringBill>> GetAllAsync(CancellationToken cancellationToken)
    {
        var bills = await db.RecurringBills.OrderBy(b => b.NextDueDate).ToListAsync(cancellationToken);
        return bills;
    }

    public Task<Result<RecurringBill>> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var billId = new RecurringBillId(id);
        return db.RecurringBills.FindOrNotFoundAsync(b => b.Id == billId, "Recurring entry not found.", cancellationToken);
    }

    public async Task<Result<RecurringBill>> CreateAsync(RecurringBill bill, CancellationToken cancellationToken)
    {
        var error = await ValidateReferencesAsync(bill, cancellationToken);
        if (error is not null) return error;

        db.RecurringBills.Add(bill);
        await db.SaveChangesAsync(cancellationToken);

        return bill;
    }

    public async Task<Result<RecurringBill>> UpdateAsync(Guid id, Action<RecurringBill> apply, CancellationToken cancellationToken)
    {
        var billId = new RecurringBillId(id);
        var bill = await db.RecurringBills.FirstOrDefaultAsync(b => b.Id == billId, cancellationToken);
        if (bill is null)
        {
            return new DomainError(ErrorCodes.ResourceNotFound, "Recurring entry not found.");
        }

        apply(bill);
        var error = await ValidateReferencesAsync(bill, cancellationToken);
        if (error is not null) return error;
        await db.SaveChangesAsync(cancellationToken);

        return bill;
    }

    public Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var billId = new RecurringBillId(id);
        return db.DeleteOrNotFoundAsync<RecurringBill>(
            id,
            b => b.Id == billId,
            "Recurring entry not found.",
            bill => deletions.Record(TrashKind.RecurringBill, id, bill.Name),
            cancellationToken);
    }

    public async Task<Result<RecurringBillConfirmation>> ConfirmAsync(
        ConfirmRecurringBillRequest request,
        CancellationToken cancellationToken)
    {
        await using var dbTransaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await db.Database.LockAsync(request.Id, cancellationToken);
        var billId = new RecurringBillId(request.Id);
        var bill = await db.RecurringBills.FirstOrDefaultAsync(b => b.Id == billId, cancellationToken);
        if (bill is null)
        {
            return new DomainError(ErrorCodes.ResourceNotFound, "Recurring entry not found.");
        }

        if (!bill.IsActive)
            return new DomainError(ErrorCodes.RecurringBillInactive, "This recurring entry is inactive.");
        if (request.ExpectedDueDate != bill.NextDueDate)
            return new DomainError(ErrorCodes.ConflictStale, "This occurrence has changed or was already confirmed. Refresh the entry.");

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
        }

        bill.Advance();

        await db.Notifications.Where(n => n.RelatedType == "RecurringBill" && n.RelatedId == request.Id && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true), cancellationToken);

        await db.SaveChangesAsync(cancellationToken);

        await dbTransaction.CommitAsync(cancellationToken);
        return new RecurringBillConfirmation(bill, transactionId, transferId);
    }

    private static Result<decimal> ResolveAmount(RecurringBill bill, ConfirmRecurringBillRequest request)
    {
        if (bill.Kind == RecurringBillKind.Fixed)
        {
            return bill.Amount!.Value.Amount;
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

        var flow = FlowOf(bill.Shape);
        var referenceError = await references.AccountExistsAsync(accountId.Value, cancellationToken);
        if (referenceError is null && bill.CategoryId is { } categoryId)
        {
            referenceError = await references.CategoryOfTypeAsync(categoryId, flow, CategoryGone, cancellationToken);
        }

        if (referenceError is not null)
        {
            return referenceError;
        }

        var transaction = new Transaction
        {
            AccountId = accountId.Value,
            CategoryId = bill.CategoryId,
            Type = flow,
            Amount = new Money(amount, rates.ReportingCurrency),
            ReportingAmount = amount,
            Date = bill.NextDueDate,
            Description = bill.Name,
            Source = TransactionSource.Manual,
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

        if (!created.TryGetValue(out var transfer))
        {
            return created.Error;
        }

        return transfer.Id;
    }

    private static FlowType FlowOf(RecurringBillShape shape) =>
        shape == RecurringBillShape.Income ? FlowType.Income : FlowType.Expense;

    private async Task<DomainError?> ValidateReferencesAsync(RecurringBill bill, CancellationToken ct)
    {
        if (bill.AccountId is { } from && await references.AccountExistsAsync(from, ct) is { } fromError) return fromError;
        if (bill.ToAccountId is { } to && await references.AccountExistsAsync(to, ct) is { } toError) return toError;
        if (bill.Shape == RecurringBillShape.Transfer || bill.CategoryId is not { } categoryId) return null;

        var flow = FlowOf(bill.Shape);
        return await references.CategoryOfTypeAsync(
            categoryId,
            flow,
            flow == FlowType.Income ? CategoryNotIncome : CategoryNotExpense,
            ct);
    }
}
