using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Domain.NetWorth;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.NetWorth.Services;

public static class DebtBalanceBook
{
    public static async Task<DebtBalanceEntry> RecordAsync(
        AppDbContext db,
        Debt debt,
        DateOnly date,
        decimal amount,
        CancellationToken cancellationToken)
    {
        var entry = await db.DebtBalanceEntries.FindAsync([debt.Id, date], cancellationToken);
        if (entry is null)
        {
            entry = new DebtBalanceEntry { DebtId = debt.Id, Date = date, Amount = amount };
            db.DebtBalanceEntries.Add(entry);
        }
        else
        {
            entry.Amount = amount;
        }

        if (date >= debt.AsOf)
        {
            debt.OutstandingAmount = new Money(amount, debt.Currency);
            debt.AsOf = date;
        }

        return entry;
    }

    public static async Task<Result> RemoveAsync(
        AppDbContext db,
        Debt debt,
        DebtBalanceEntry entry,
        CancellationToken cancellationToken)
    {
        var newest = await db.DebtBalanceEntries
            .AsNoTracking()
            .Where(e => e.DebtId == debt.Id && e.Date != entry.Date)
            .OrderByDescending(e => e.Date)
            .FirstOrDefaultAsync(cancellationToken);
        if (newest is null)
        {
            return Result.Failure(ErrorCodes.DebtLastBalance, "A debt keeps at least one recorded balance. Delete the debt instead.");
        }

        db.DebtBalanceEntries.Remove(entry);
        debt.OutstandingAmount = new Money(newest.Amount, debt.Currency);
        debt.AsOf = newest.Date;
        return Result.Success();
    }
}
