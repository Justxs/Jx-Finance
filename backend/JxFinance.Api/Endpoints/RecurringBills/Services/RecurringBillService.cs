using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.References;
using JxFinance.Common.Validation;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.RecurringBills;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.RecurringBills.ConfirmRecurringBill;
using JxFinance.Endpoints.RecurringBills.Interfaces;
using JxFinance.Endpoints.RecurringBills.Shared;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.RecurringBills.Services;

[RegisterService<IRecurringBillService>(LifeTime.Scoped)]
public sealed class RecurringBillService(
    AppDbContext db,
    IExchangeRateService rates,
    IReferenceGuard references) : IRecurringBillService
{
    private static readonly DomainError CategoryGone =
        new(ErrorCodes.ReferenceNotFound, "The bill category is no longer available.");

    private static readonly DomainError CategoryNotExpense =
        new(ErrorCodes.CategoryWrongType, "Choose an accessible expense category.");

    public async Task<IReadOnlyList<RecurringBill>> GetAllAsync(CancellationToken cancellationToken)
    {
        var bills = await db.RecurringBills.OrderBy(b => b.NextDueDate).ToListAsync(cancellationToken);
        return bills;
    }

    public Task<Result<RecurringBill>> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var billId = new RecurringBillId(id);
        return db.RecurringBills.FindOrNotFoundAsync(b => b.Id == billId, "Recurring bill not found.", cancellationToken);
    }

    public async Task<Result<RecurringBill>> CreateAsync(RecurringBill bill, CancellationToken cancellationToken)
    {
        var error = await ValidateReferencesAsync(bill.AccountId?.Value, bill.CategoryId?.Value, cancellationToken);
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
            return new DomainError(ErrorCodes.ResourceNotFound, "Recurring bill not found.");
        }

        apply(bill);
        var error = await ValidateReferencesAsync(bill.AccountId?.Value, bill.CategoryId?.Value, cancellationToken);
        if (error is not null) return error;
        await db.SaveChangesAsync(cancellationToken);

        return bill;
    }

    public Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var billId = new RecurringBillId(id);
        return db.DeleteOrNotFoundAsync<RecurringBill>(id, b => b.Id == billId, "Recurring bill not found.", cancellationToken);
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
            return new DomainError(ErrorCodes.ResourceNotFound, "Recurring bill not found.");
        }

        if (!bill.IsActive)
            return new DomainError(ErrorCodes.RecurringBillInactive, "This bill is inactive.");
        if (request.ExpectedDueDate != bill.NextDueDate)
            return new DomainError(ErrorCodes.ConflictStale, "This occurrence has changed or was already confirmed. Refresh the bill.");

        Money amount;
        if (bill.Kind == RecurringBillKind.Fixed)
        {
            amount = bill.Amount!.Value;
        }
        else
        {
            if (request.Amount is not { } confirmed || confirmed <= 0 || !DecimalRules.FitsMoney(confirmed))
            {
                return new DomainError(
                    ErrorCodes.MoneyPositive,
                    "A variable bill needs an amount to confirm.");
            }

            amount = new Money(confirmed);
        }

        var accountId = request.AccountId is { } requestAccountId ? new AccountId(requestAccountId) : bill.AccountId;
        if (accountId is null)
        {
            return new DomainError(
                ErrorCodes.Required,
                "An account is required to confirm this bill.");
        }

        var referenceError = await references.AccountExistsAsync(accountId.Value, cancellationToken);
        if (referenceError is null && bill.CategoryId is { } categoryId)
        {
            referenceError = await references.CategoryOfTypeAsync(categoryId, FlowType.Expense, CategoryGone, cancellationToken);
        }

        if (referenceError is not null)
        {
            return referenceError;
        }

        var transaction = new Transaction
        {
            AccountId = accountId.Value,
            CategoryId = bill.CategoryId,
            Type = FlowType.Expense,
            Amount = new Money(amount.Amount, rates.ReportingCurrency),
            ReportingAmount = amount.Amount,
            Date = bill.NextDueDate,
            Description = bill.Name,
            Source = TransactionSource.Manual,
        };
        db.Transactions.Add(transaction);

        bill.Advance();

        await db.Notifications.Where(n => n.RelatedType == "RecurringBill" && n.RelatedId == request.Id && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true), cancellationToken);

        await db.SaveChangesAsync(cancellationToken);

        await dbTransaction.CommitAsync(cancellationToken);
        return new RecurringBillConfirmation(bill, transaction.Id.Value);
    }

    private async Task<DomainError?> ValidateReferencesAsync(Guid? accountId, Guid? categoryId, CancellationToken ct)
    {
        if (accountId is { } a && await references.AccountExistsAsync(new AccountId(a), ct) is { } accountError) return accountError;
        return categoryId is { } c
            ? await references.CategoryOfTypeAsync(new CategoryId(c), FlowType.Expense, CategoryNotExpense, ct)
            : null;
    }
}
