using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
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
    IExchangeRateService rates) : IRecurringBillService
{
    public async Task<IReadOnlyList<RecurringBill>> GetAllAsync(CancellationToken cancellationToken)
    {
        var bills = await db.RecurringBills.OrderBy(b => b.NextDueDate).ToListAsync(cancellationToken);
        return bills;
    }

    public async Task<Result<RecurringBill>> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var billId = new RecurringBillId(id);
        var bill = await db.RecurringBills.FirstOrDefaultAsync(b => b.Id == billId, cancellationToken);
        return bill is null
            ? Result<RecurringBill>.Failure(ErrorCodes.ResourceNotFound, "Recurring bill not found.")
            : Result<RecurringBill>.Success(bill);
    }

    public async Task<Result<RecurringBill>> CreateAsync(RecurringBill bill, CancellationToken cancellationToken)
    {
        var error = await ValidateReferencesAsync(bill.AccountId?.Value, bill.CategoryId?.Value, cancellationToken);
        if (error is not null) return Result<RecurringBill>.Failure(error);

        db.RecurringBills.Add(bill);
        await db.SaveChangesAsync(cancellationToken);

        return Result<RecurringBill>.Success(bill);
    }

    public async Task<Result<RecurringBill>> UpdateAsync(Guid id, Action<RecurringBill> apply, CancellationToken cancellationToken)
    {
        var billId = new RecurringBillId(id);
        var bill = await db.RecurringBills.FirstOrDefaultAsync(b => b.Id == billId, cancellationToken);
        if (bill is null)
        {
            return Result<RecurringBill>.Failure(ErrorCodes.ResourceNotFound, "Recurring bill not found.");
        }

        apply(bill);
        var error = await ValidateReferencesAsync(bill.AccountId?.Value, bill.CategoryId?.Value, cancellationToken);
        if (error is not null) return Result<RecurringBill>.Failure(error);
        await db.SaveChangesAsync(cancellationToken);

        return Result<RecurringBill>.Success(bill);
    }

    public async Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var billId = new RecurringBillId(id);
        var bill = await db.RecurringBills.FirstOrDefaultAsync(b => b.Id == billId, cancellationToken);
        if (bill is null)
        {
            return Result<Guid>.Failure(ErrorCodes.ResourceNotFound, "Recurring bill not found.");
        }

        db.RecurringBills.Remove(bill);
        await db.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(id);
    }

    public async Task<Result<RecurringBillConfirmation>> ConfirmAsync(
        ConfirmRecurringBillRequest request,
        CancellationToken cancellationToken)
    {
        await using var dbTransaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var lockId = BitConverter.ToInt64(request.Id.ToByteArray(), 0);
        await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock({lockId})", cancellationToken);
        var billId = new RecurringBillId(request.Id);
        var bill = await db.RecurringBills.FirstOrDefaultAsync(b => b.Id == billId, cancellationToken);
        if (bill is null)
        {
            return Result<RecurringBillConfirmation>.Failure(ErrorCodes.ResourceNotFound, "Recurring bill not found.");
        }

        if (!bill.IsActive)
            return Result<RecurringBillConfirmation>.Failure(ErrorCodes.RecurringBillInactive, "This bill is inactive.");
        if (request.ExpectedDueDate != bill.NextDueDate)
            return Result<RecurringBillConfirmation>.Failure(ErrorCodes.ConflictStale, "This occurrence has changed or was already confirmed. Refresh the bill.");

        Money amount;
        if (bill.Kind == RecurringBillKind.Fixed)
        {
            amount = bill.Amount!.Value;
        }
        else
        {
            if (request.Amount is not { } confirmed || confirmed <= 0 || !DecimalRules.FitsMoney(confirmed))
            {
                return Result<RecurringBillConfirmation>.Failure(
                    ErrorCodes.MoneyPositive,
                    "A variable bill needs an amount to confirm.");
            }

            amount = new Money(confirmed);
        }

        var accountId = request.AccountId is { } requestAccountId ? new AccountId(requestAccountId) : bill.AccountId;
        if (accountId is null)
        {
            return Result<RecurringBillConfirmation>.Failure(
                ErrorCodes.Required,
                "An account is required to confirm this bill.");
        }

        var accountExists = await db.Accounts.AnyAsync(a => a.Id == accountId, cancellationToken);
        if (!accountExists)
        {
            return Result<RecurringBillConfirmation>.Failure(ErrorCodes.ReferenceNotFound, "Account does not exist.");
        }

        if (bill.CategoryId is { } categoryId && !await db.Categories.AnyAsync(c => c.Id == categoryId && c.Type == FlowType.Expense, cancellationToken))
            return Result<RecurringBillConfirmation>.Failure(ErrorCodes.ReferenceNotFound, "The bill category is no longer available.");

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
        return Result<RecurringBillConfirmation>.Success(
            new RecurringBillConfirmation(bill, transaction.Id.Value));
    }

    private async Task<DomainError?> ValidateReferencesAsync(Guid? accountId, Guid? categoryId, CancellationToken ct)
    {
        if (accountId is { } a && !await db.Accounts.AnyAsync(x => x.Id == new AccountId(a), ct)) return new DomainError(ErrorCodes.ReferenceNotFound, "Account does not exist.");
        if (categoryId is { } c && !await db.Categories.AnyAsync(x => x.Id == new CategoryId(c) && x.Type == FlowType.Expense, ct)) return new DomainError(ErrorCodes.CategoryWrongType, "Choose an accessible expense category.");
        return null;
    }
}
