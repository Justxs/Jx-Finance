using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure.Data;

public static class DebtBalanceBackfill
{
    public static Task<int> RunAsync(AppDbContext db, CancellationToken cancellationToken) =>
        db.Database.ExecuteSqlAsync(
            $"""
            INSERT INTO "DebtBalanceEntries" ("DebtId", "Date", "Amount")
            SELECT d."Id", d."AsOf", d."OutstandingAmount"
            FROM "Debts" AS d
            WHERE NOT EXISTS (SELECT 1 FROM "DebtBalanceEntries" AS e WHERE e."DebtId" = d."Id")
            """,
            cancellationToken);
}
