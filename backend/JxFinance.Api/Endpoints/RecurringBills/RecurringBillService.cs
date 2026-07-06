using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.RecurringBills;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.RecurringBills.ConfirmRecurringBill;
using JxFinance.Endpoints.RecurringBills.CreateRecurringBill;
using JxFinance.Endpoints.RecurringBills.UpdateRecurringBill;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.RecurringBills;

public sealed class RecurringBillService(AppDbContext db) : IRecurringBillService
{
    public async Task<IReadOnlyList<RecurringBillResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var bills = await db.RecurringBills.OrderBy(b => b.NextDueDate).ToListAsync(cancellationToken);
        return bills.Select(ToResponse).ToList();
    }

    public async Task<Result<RecurringBillResponse>> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var billId = new RecurringBillId(id);
        var bill = await db.RecurringBills.FirstOrDefaultAsync(b => b.Id == billId, cancellationToken);
        return bill is null
            ? Result<RecurringBillResponse>.Failure(ErrorCodes.NotFound, "Recurring bill not found.")
            : Result<RecurringBillResponse>.Success(ToResponse(bill));
    }

    public async Task<RecurringBillResponse> CreateAsync(
        CreateRecurringBillRequest request,
        CancellationToken cancellationToken)
    {
        var bill = new RecurringBill
        {
            Name = request.Name.Trim(),
            Kind = request.Kind,
            Amount = request.Amount is null ? null : MoneyWire.Parse(request.Amount),
            CategoryId = request.CategoryId is { } categoryId ? new CategoryId(categoryId) : null,
            AccountId = request.AccountId is { } accountId ? new AccountId(accountId) : null,
            Cadence = request.Cadence,
            NextDueDate = request.NextDueDate,
            RemindDaysBefore = request.RemindDaysBefore,
        };

        db.RecurringBills.Add(bill);
        await db.SaveChangesAsync(cancellationToken);

        return ToResponse(bill);
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

        bill.Name = request.Name.Trim();
        bill.Kind = request.Kind;
        bill.Amount = request.Amount is null ? null : MoneyWire.Parse(request.Amount);
        bill.CategoryId = request.CategoryId is { } categoryId ? new CategoryId(categoryId) : null;
        bill.AccountId = request.AccountId is { } accountId ? new AccountId(accountId) : null;
        bill.Cadence = request.Cadence;
        bill.NextDueDate = request.NextDueDate;
        bill.RemindDaysBefore = request.RemindDaysBefore;
        bill.IsActive = request.IsActive;
        await db.SaveChangesAsync(cancellationToken);

        return Result<RecurringBillResponse>.Success(ToResponse(bill));
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
        var billId = new RecurringBillId(request.Id);
        var bill = await db.RecurringBills.FirstOrDefaultAsync(b => b.Id == billId, cancellationToken);
        if (bill is null)
        {
            return Result<ConfirmRecurringBillResponse>.Failure(ErrorCodes.NotFound, "Recurring bill not found.");
        }

        Money amount;
        if (bill.Kind == RecurringBillKind.Fixed)
        {
            amount = bill.Amount!.Value;
        }
        else
        {
            if (string.IsNullOrWhiteSpace(request.Amount) || !MoneyWire.IsValid(request.Amount))
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

        await db.SaveChangesAsync(cancellationToken);

        return Result<ConfirmRecurringBillResponse>.Success(
            new ConfirmRecurringBillResponse(ToResponse(bill), transaction.Id.Value));
    }

    private static RecurringBillResponse ToResponse(RecurringBill bill) => new(
        bill.Id.Value,
        bill.Name,
        bill.Kind,
        bill.Amount is null ? null : MoneyWire.ToWire(bill.Amount.Value),
        bill.CategoryId?.Value,
        bill.AccountId?.Value,
        bill.Cadence,
        bill.NextDueDate,
        bill.RemindDaysBefore,
        bill.IsActive);
}
