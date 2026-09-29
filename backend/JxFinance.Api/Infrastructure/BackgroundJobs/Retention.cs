using JxFinance.Domain.Audit;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Trash;
using JxFinance.Infrastructure.Attachments;
using JxFinance.Infrastructure.Auth;
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
        TrashKind.CsvImportMapping,
        TrashKind.SharedExpense,
        TrashKind.Settlement,
    ];

    internal static IReadOnlyList<TrashKind> KeptKinds { get; } =
    [
        TrashKind.Attachment,
        TrashKind.Category,
        TrashKind.Tag,
        TrashKind.Household,
    ];

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

    internal static Task<int> PruneApiTokensAsync(AppDbContext db, DateTimeOffset now, CancellationToken ct)
    {
        var cutoff = now - PersonalApiToken.KeptAfterExpiry;
        return db.PersonalApiTokens.Where(t => t.ExpiresAt < cutoff).ExecuteDeleteAsync(ct);
    }

    internal static Task<int> PruneDeletionEntriesAsync(AppDbContext db, DateTimeOffset now, CancellationToken ct)
    {
        var cutoff = DeletionEntry.WindowStart(now);
        return PurgeAsync(db.DeletionEntries.IgnoreQueryFilters().Where(e => e.DeletedAt < cutoff), ct);
    }

    internal static async Task<int> PurgeDeletedAsync(
        AppDbContext db,
        AttachmentStore files,
        DateTimeOffset now,
        CancellationToken ct)
    {
        var cutoff = DeletionEntry.WindowStart(now);
        var transfers = Expired(db.Transfers, cutoff);
        var transactions = Expired(db.Transactions, cutoff)
            .Where(t => !db.CurrencyConversions.IgnoreQueryFilters().Any(c => c.FeeTransactionId == t.Id));

        var purged = await PurgeAsync(Expired(db.CurrencyConversions, cutoff), ct);
        await PurgeAsync(db.TransferImports.Where(r => transfers.Any(t => t.Id == r.TransferId)), ct);
        purged += await PurgeAsync(transfers, ct);
        await DeleteAttachmentsAsync(
            db,
            files,
            db.TransactionAttachments.IgnoreQueryFilters().Where(a => transactions.Any(t => t.Id == a.TransactionId)),
            ct);
        purged += await PurgeAsync(transactions, ct);
        purged += await PurgeAsync(Expired(db.Budgets, cutoff), ct);
        purged += await PurgeAsync(Expired(db.Goals, cutoff), ct);
        purged += await PurgeAsync(Expired(db.Assets, cutoff), ct);
        purged += await PurgeAsync(Expired(db.Debts, cutoff), ct);
        purged += await PurgeAsync(Expired(db.RecurringBills, cutoff), ct);
        purged += await PurgeAsync(Expired(db.InvestmentTransactions, cutoff), ct);
        purged += await PurgeAsync(Expired(db.CategorizationRules, cutoff), ct);
        purged += await PurgeAsync(Expired(db.CsvImportMappings, cutoff), ct);
        purged += await PurgeAsync(Expired(db.SharedExpenses, cutoff), ct);
        purged += await PurgeAsync(Expired(db.Settlements, cutoff), ct);
        return purged;
    }

    internal static async Task<int> DeleteAttachmentsAsync(
        AppDbContext db,
        AttachmentStore files,
        IQueryable<TransactionAttachment> attachments,
        CancellationToken ct)
    {
        var ids = await attachments.Select(a => a.Id).ToListAsync(ct);
        if (ids.Count == 0)
        {
            return 0;
        }

        await db.TransactionAttachments.IgnoreQueryFilters().Where(a => ids.Contains(a.Id)).ExecuteDeleteAsync(ct);
        foreach (var id in ids)
        {
            files.Delete(id.Value);
        }

        return ids.Count;
    }

    private static IQueryable<TEntity> Expired<TEntity>(IQueryable<TEntity> rows, DateTimeOffset cutoff)
        where TEntity : EntityBase =>
        rows.IgnoreQueryFilters().Where(e => e.IsDeleted && e.UpdatedAt < cutoff);

    internal static async Task<int> PurgeAsync<TEntity>(IQueryable<TEntity> expired, CancellationToken ct)
        where TEntity : class
    {
        int deleted, purged = 0;
        do
        {
            purged += deleted = await expired
                .OrderBy(e => EF.Property<object>(e, "Id"))
                .Take(BatchSize)
                .ExecuteDeleteAsync(ct);
        }
        while (deleted == BatchSize);

        return purged;
    }
}
