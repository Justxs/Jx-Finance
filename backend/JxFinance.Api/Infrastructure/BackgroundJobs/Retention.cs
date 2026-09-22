using System.Linq.Expressions;
using JxFinance.Domain.Audit;
using JxFinance.Domain.Common;
using JxFinance.Domain.Trash;
using JxFinance.Infrastructure.Attachments;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure.BackgroundJobs;

internal static class Retention
{
    internal const int BatchSize = 500;

    internal static IReadOnlyList<TrashKind> PurgedKinds { get; } =
    [
        TrashKind.Conversion,
        TrashKind.Transfer,
        TrashKind.Transaction,
        TrashKind.Budget,
        TrashKind.Goal,
        TrashKind.Asset,
        TrashKind.Debt,
        TrashKind.RecurringBill,
        TrashKind.InvestmentTransaction,
        TrashKind.CategorizationRule,
    ];

    internal static IReadOnlyList<TrashKind> KeptKinds { get; } =
    [
        TrashKind.Attachment,
        TrashKind.Category,
        TrashKind.Tag,
        TrashKind.Household,
    ];

    internal static DateTimeOffset PurgeStart(DateTimeOffset now) => DeletionEntry.WindowStart(now);

    internal static Task<int> PruneAuditEventsAsync(AppDbContext db, DateTimeOffset now, CancellationToken ct)
    {
        var cutoff = AuditEvent.RetentionStart(now);
        return db.AuditEvents.Where(e => e.OccurredAt < cutoff).ExecuteDeleteAsync(ct);
    }

    internal static Task<int> PruneSessionsAsync(AppDbContext db, DateTimeOffset now, CancellationToken ct) =>
        db.UserSessions
            .Where(s => s.ExpiresAt <= now
                || !db.Users.Any(u => u.Id == s.UserId && (u.SecurityStamp ?? string.Empty) == s.SecurityStamp))
            .ExecuteDeleteAsync(ct);

    internal static Task<int> PruneDeletionEntriesAsync(AppDbContext db, DateTimeOffset now, CancellationToken ct)
    {
        var cutoff = PurgeStart(now);
        return PurgeAsync(
            db.DeletionEntries.IgnoreQueryFilters().Where(e => e.DeletedAt < cutoff),
            e => e.Id,
            ids => db.DeletionEntries.IgnoreQueryFilters().Where(e => ids.Contains(e.Id)),
            ct);
    }

    internal static async Task<int> PurgeDeletedAsync(
        AppDbContext db,
        AttachmentStore files,
        DateTimeOffset now,
        CancellationToken ct)
    {
        var cutoff = PurgeStart(now);

        var purged = await PurgeAsync(
            Expired(db.CurrencyConversions, cutoff),
            c => c.Id,
            ids => db.CurrencyConversions.IgnoreQueryFilters().Where(c => ids.Contains(c.Id)),
            ct);
        purged += await PurgeTransfersAsync(db, cutoff, ct);
        purged += await PurgeTransactionsAsync(db, files, cutoff, ct);
        purged += await PurgeAsync(
            Expired(db.Budgets, cutoff),
            b => b.Id,
            ids => db.Budgets.IgnoreQueryFilters().Where(b => ids.Contains(b.Id)),
            ct);
        purged += await PurgeAsync(
            Expired(db.Goals, cutoff),
            g => g.Id,
            ids => db.Goals.IgnoreQueryFilters().Where(g => ids.Contains(g.Id)),
            ct);
        purged += await PurgeAsync(
            Expired(db.Assets, cutoff),
            a => a.Id,
            ids => db.Assets.IgnoreQueryFilters().Where(a => ids.Contains(a.Id)),
            ct);
        purged += await PurgeAsync(
            Expired(db.Debts, cutoff),
            d => d.Id,
            ids => db.Debts.IgnoreQueryFilters().Where(d => ids.Contains(d.Id)),
            ct);
        purged += await PurgeAsync(
            Expired(db.RecurringBills, cutoff),
            b => b.Id,
            ids => db.RecurringBills.IgnoreQueryFilters().Where(b => ids.Contains(b.Id)),
            ct);
        purged += await PurgeAsync(
            Expired(db.InvestmentTransactions, cutoff),
            t => t.Id,
            ids => db.InvestmentTransactions.IgnoreQueryFilters().Where(t => ids.Contains(t.Id)),
            ct);
        purged += await PurgeAsync(
            Expired(db.CategorizationRules, cutoff),
            r => r.Id,
            ids => db.CategorizationRules.IgnoreQueryFilters().Where(r => ids.Contains(r.Id)),
            ct);

        return purged;
    }

    private static IQueryable<TEntity> Expired<TEntity>(IQueryable<TEntity> rows, DateTimeOffset cutoff)
        where TEntity : EntityBase =>
        rows.IgnoreQueryFilters().Where(e => e.IsDeleted && e.UpdatedAt < cutoff);

    private static async Task<int> PurgeTransfersAsync(AppDbContext db, DateTimeOffset cutoff, CancellationToken ct)
    {
        var purged = 0;
        while (true)
        {
            var batch = await Expired(db.Transfers, cutoff).Select(t => t.Id).Take(BatchSize).ToListAsync(ct);
            if (batch.Count == 0)
            {
                return purged;
            }

            await db.TransferImports.Where(r => batch.Contains(r.TransferId)).ExecuteDeleteAsync(ct);
            purged += await db.Transfers.IgnoreQueryFilters().Where(t => batch.Contains(t.Id)).ExecuteDeleteAsync(ct);
            if (batch.Count < BatchSize)
            {
                return purged;
            }
        }
    }

    private static async Task<int> PurgeTransactionsAsync(
        AppDbContext db,
        AttachmentStore files,
        DateTimeOffset cutoff,
        CancellationToken ct)
    {
        var purged = 0;
        while (true)
        {
            var batch = await Expired(db.Transactions, cutoff)
                .Where(t => !db.CurrencyConversions.IgnoreQueryFilters().Any(c => c.FeeTransactionId == t.Id))
                .Select(t => t.Id)
                .Take(BatchSize)
                .ToListAsync(ct);
            if (batch.Count == 0)
            {
                return purged;
            }

            var attachments = await db.TransactionAttachments
                .IgnoreQueryFilters()
                .Where(a => batch.Contains(a.TransactionId))
                .Select(a => a.Id)
                .ToListAsync(ct);
            if (attachments.Count > 0)
            {
                await db.TransactionAttachments
                    .IgnoreQueryFilters()
                    .Where(a => attachments.Contains(a.Id))
                    .ExecuteDeleteAsync(ct);
                foreach (var id in attachments)
                {
                    files.Delete(id.Value);
                }
            }

            purged += await db.Transactions.IgnoreQueryFilters().Where(t => batch.Contains(t.Id)).ExecuteDeleteAsync(ct);
            if (batch.Count < BatchSize)
            {
                return purged;
            }
        }
    }

    private static async Task<int> PurgeAsync<TEntity, TId>(
        IQueryable<TEntity> expired,
        Expression<Func<TEntity, TId>> id,
        Func<List<TId>, IQueryable<TEntity>> byIds,
        CancellationToken ct)
        where TEntity : class
    {
        var purged = 0;
        while (true)
        {
            var batch = await expired.Select(id).Take(BatchSize).ToListAsync(ct);
            if (batch.Count == 0)
            {
                return purged;
            }

            purged += await byIds(batch).ExecuteDeleteAsync(ct);
            if (batch.Count < BatchSize)
            {
                return purged;
            }
        }
    }
}
