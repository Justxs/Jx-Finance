using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure.Data;

public static class SpreadFromBackfill
{
    public static Task<int> RunAsync(AppDbContext db, CancellationToken cancellationToken) =>
        db.Database.ExecuteSqlAsync(
            $"""
            UPDATE "Transactions" SET "SpreadFrom" = "Date"
            WHERE "SpreadMonths" IS NOT NULL AND "SpreadFrom" IS NULL
            """,
            cancellationToken);
}
