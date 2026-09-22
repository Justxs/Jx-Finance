using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.References;
using JxFinance.Common.Trash;
using JxFinance.Common.Validation;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Notifications;
using JxFinance.Domain.RecurringBills;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Trash;
using JxFinance.Endpoints.RecurringBills.ConfirmRecurringBill;
using JxFinance.Endpoints.RecurringBills.CreateRecurringBill;
using JxFinance.Endpoints.RecurringBills.Interfaces;
using JxFinance.Endpoints.RecurringBills.Mappers;
using JxFinance.Endpoints.RecurringBills.Shared;
using JxFinance.Endpoints.RecurringBills.UpdateRecurringBill;
using JxFinance.Endpoints.Transfers.CreateTransfer;
using JxFinance.Endpoints.Transfers.Interfaces;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.RecurringBills.Services;

[RegisterService<IRecurringBillService>(LifeTime.Scoped)]
public sealed class RecurringBillService(
    AppDbContext db,
    ITransactionValuation valuations,
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

    public async Task<IReadOnlyList<RecurringBillResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var bills = await db.RecurringBills.AsNoTracking().OrderBy(b => b.NextDueDate).ToListAsync(cancellationToken);
        return bills.Select(b => b.ToResponse()).ToList();
    }

    public async Task<Result<RecurringBillResponse>> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var billId = new RecurringBillId(id);
        var found = await db.RecurringBills.FindOrNotFoundAsync(b => b.Id == billId, "Recurring entry not found.", cancellationToken);
        return found.TryGetValue(out var bill) ? bill.ToResponse() : found.Error;
    }

    public async Task<Result<RecurringBillResponse>> CreateAsync(
        CreateRecurringBillRequest request,
        CancellationToken cancellationToken)
    {
        var error = await ValidateReferencesAsync(request, cancellationToken);
        if (error is not null) return error;

        var bill = request.ToEntity();
        db.RecurringBills.Add(bill);
        await db.SaveChangesAsync(cancellationToken);

        return bill.ToResponse();
    }

    public async Task<Result<RecurringBillResponse>> UpdateAsync(
        UpdateRecurringBillRequest request,
        CancellationToken cancellationToken)
    {
        var billId = new RecurringBillId(request.Id);
        var found = await db.RecurringBills.FindOrNotFoundAsync(b => b.Id == billId, "Recurring entry not found.", cancellationToken);
        if (!found.TryGetValue(out var bill))
        {
            return found.Error;
        }

        var error = await ValidateReferencesAsync(request, cancellationToken);
        if (error is not null) return error;

        request.ApplyTo(bill);
        await db.SaveChangesAsync(cancellationToken);

        return bill.ToResponse();
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

    public async Task<Result<ConfirmRecurringBillResponse>> ConfirmAsync(
        ConfirmRecurringBillRequest request,
        CancellationToken cancellationToken)
    {
        await using var dbTransaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await db.Database.LockAsync(request.Id, cancellationToken);
        var billId = new RecurringBillId(request.Id);
        var found = await db.RecurringBills.FindOrNotFoundAsync(b => b.Id == billId, "Recurring entry not found.", cancellationToken);
        if (!found.TryGetValue(out var bill))
        {
            return found.Error;
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

        await db.Notifications.Where(n => n.RelatedType == NotificationRelated.RecurringBill && n.RelatedId == request.Id && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true), cancellationToken);

        await db.SaveChangesAsync(cancellationToken);

        await dbTransaction.CommitAsync(cancellationToken);
        return new ConfirmRecurringBillResponse(bill.ToResponse(), transactionId, transferId);
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

    private async Task<DomainError?> ValidateReferencesAsync(IRecurringBillInput input, CancellationToken ct)
    {
        if (input.AccountId is { } from && await references.AccountExistsAsync(new AccountId(from), ct) is { } fromError) return fromError;
        if (input.ToAccountId is { } to && await references.AccountExistsAsync(new AccountId(to), ct) is { } toError) return toError;
        if (input.Shape == RecurringBillShape.Transfer || input.CategoryId is not { } categoryId) return null;

        var flow = FlowOf(input.Shape);
        return await references.CategoryOfTypeAsync(
            new CategoryId(categoryId),
            flow,
            flow == FlowType.Income ? CategoryNotIncome : CategoryNotExpense,
            ct);
    }
}
