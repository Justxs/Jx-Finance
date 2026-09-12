using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.RecurringBills;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.RecurringBills.ConfirmRecurringBill;
using JxFinance.Endpoints.RecurringBills.CreateRecurringBill;
using JxFinance.Endpoints.RecurringBills.Interfaces;
using JxFinance.Endpoints.RecurringBills.Mappers;
using JxFinance.Endpoints.RecurringBills.Shared;
using JxFinance.Endpoints.RecurringBills.UpdateRecurringBill;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.RecurringBills.Services;

public sealed class RecurringBillService(AppDbContext db, RecurringBillMapper mapper) : IRecurringBillService
{
    public async Task<IReadOnlyList<RecurringBillResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var bills = await db.RecurringBills.OrderBy(b => b.NextDueDate).ToListAsync(cancellationToken);
        return bills.Select(mapper.FromEntity).ToList();
    }

    public async Task<Result<RecurringBillResponse>> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var billId = new RecurringBillId(id);
        var bill = await db.RecurringBills.FirstOrDefaultAsync(b => b.Id == billId, cancellationToken);
        return bill is null
            ? Result<RecurringBillResponse>.Failure(ErrorCodes.NotFound, "Recurring bill not found.")
            : Result<RecurringBillResponse>.Success(mapper.FromEntity(bill));
    }

    public async Task<Result<RecurringBillResponse>> CreateAsync(
        CreateRecurringBillRequest request,
        CancellationToken cancellationToken)
    {
        var error = await ValidateReferencesAsync(request.AccountId, request.CategoryId, cancellationToken);
        if (error is not null) return Result<RecurringBillResponse>.Failure(ErrorCodes.Validation, error);
        var bill = mapper.ToEntity(request);

        db.RecurringBills.Add(bill);
        await db.SaveChangesAsync(cancellationToken);

        return Result<RecurringBillResponse>.Success(mapper.FromEntity(bill));
    }

    public async Task<Result<RecurringBillResponse>> UpdateAsync(
        UpdateRecurringBillRequest request,
        CancellationToken cancellationToken)
    {
        var billId = new RecurringBillId(request.Id);
        var bill = await db.RecurringBills.FirstOrDefaultAsync(b => b.Id == billId, cancellationToken);
        if (bill is null)
        {
            return Result<RecurringBillResponse>.Failure(ErrorCodes.NotFound, "Recurring bill not found.");
        }

        var error = await ValidateReferencesAsync(request.AccountId, request.CategoryId, cancellationToken);
        if (error is not null) return Result<RecurringBillResponse>.Failure(ErrorCodes.Validation, error);
        mapper.UpdateEntity(request, bill);
        await db.SaveChangesAsync(cancellationToken);

        return Result<RecurringBillResponse>.Success(mapper.FromEntity(bill));
    }

    public async Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var billId = new RecurringBillId(id);
        var bill = await db.RecurringBills.FirstOrDefaultAsync(b => b.Id == billId, cancellationToken);
        if (bill is null)
        {
            return Result<Guid>.Failure(ErrorCodes.NotFound, "Recurring bill not found.");
        }

        db.RecurringBills.Remove(bill);
        await db.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(id);
    }

    public async Task<Result<ConfirmRecurringBillResponse>> ConfirmAsync(
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
            return Result<ConfirmRecurringBillResponse>.Failure(ErrorCodes.NotFound, "Recurring bill not found.");
        }

        if (!bill.IsActive)
            return Result<ConfirmRecurringBillResponse>.Failure(ErrorCodes.Validation, "This bill is inactive.");
        if (request.ExpectedDueDate != bill.NextDueDate)
            return Result<ConfirmRecurringBillResponse>.Failure(ErrorCodes.Conflict, "This occurrence has changed or was already confirmed. Refresh the bill.");

        Money amount;
        if (bill.Kind == RecurringBillKind.Fixed)
        {
            amount = bill.Amount!.Value;
        }
        else
        {
            if (string.IsNullOrWhiteSpace(request.Amount) || (!MoneyWire.IsValid(request.Amount) || MoneyWire.Parse(request.Amount).Amount <= 0))
            {
                return Result<ConfirmRecurringBillResponse>.Failure(
                    ErrorCodes.Validation,
                    "A variable bill needs an amount to confirm.");
            }

            amount = MoneyWire.Parse(request.Amount);
        }

        var accountId = request.AccountId is { } requestAccountId ? new AccountId(requestAccountId) : bill.AccountId;
        if (accountId is null)
        {
            return Result<ConfirmRecurringBillResponse>.Failure(
                ErrorCodes.Validation,
                "An account is required to confirm this bill.");
        }

        var accountExists = await db.Accounts.AnyAsync(a => a.Id == accountId, cancellationToken);
        if (!accountExists)
        {
            return Result<ConfirmRecurringBillResponse>.Failure(ErrorCodes.Validation, "Account does not exist.");
        }

        if (bill.CategoryId is { } categoryId && !await db.Categories.AnyAsync(c => c.Id == categoryId && c.Type == FlowType.Expense, cancellationToken))
            return Result<ConfirmRecurringBillResponse>.Failure(ErrorCodes.Validation, "The bill category is no longer available.");

        var transaction = new Transaction
        {
            AccountId = accountId.Value,
            CategoryId = bill.CategoryId,
            Type = FlowType.Expense,
            Amount = amount,
            Date = bill.NextDueDate,
            Description = bill.Name,
            Source = TransactionSource.Manual,
        };
        db.Transactions.Add(transaction);

        bill.NextDueDate = RecurringBill.Advance(bill.NextDueDate, bill.Cadence);

        await db.Notifications.Where(n => n.RelatedType == "RecurringBill" && n.RelatedId == request.Id && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true), cancellationToken);

        await db.SaveChangesAsync(cancellationToken);

        await dbTransaction.CommitAsync(cancellationToken);
        return Result<ConfirmRecurringBillResponse>.Success(
            new ConfirmRecurringBillResponse(mapper.FromEntity(bill), transaction.Id.Value));
    }

    private async Task<string?> ValidateReferencesAsync(Guid? accountId, Guid? categoryId, CancellationToken ct)
    {
        if (accountId is { } a && !await db.Accounts.AnyAsync(x => x.Id == new AccountId(a), ct)) return "Account does not exist.";
        if (categoryId is { } c && !await db.Categories.AnyAsync(x => x.Id == new CategoryId(c) && x.Type == FlowType.Expense, ct)) return "Choose an accessible expense category.";
        return null;
    }
}
