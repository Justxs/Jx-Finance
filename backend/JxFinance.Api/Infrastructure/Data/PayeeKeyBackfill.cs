using JxFinance.Common.Subscriptions;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure.Data;

public static class PayeeKeyBackfill
{
    public const int PageSize = 1000;

    public static async Task<int> RunAsync(AppDbContext db, CancellationToken cancellationToken)
    {
        var filled = 0;
        while (true)
        {
            var page = await db.Transactions
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Where(t => t.PayeeKey == null)
                .OrderBy(t => t.Id)
                .Take(PageSize)
                .Select(t => new { t.Id, t.Payee, t.Description })
                .ToListAsync(cancellationToken);
            if (page.Count == 0)
            {
                return filled;
            }

            var ids = page.Select(t => t.Id.Value).ToArray();
            var keys = page.Select(t => SubscriptionDescription.KeyOf(t.Payee, t.Description)).ToArray();
            await db.Database.ExecuteSqlAsync(
                $"""
                UPDATE "Transactions" AS t SET "PayeeKey" = source.key
                FROM unnest({ids}, {keys}) AS source(id, key)
                WHERE t."Id" = source.id
                """,
                cancellationToken);
            filled += page.Count;
        }
    }
}
