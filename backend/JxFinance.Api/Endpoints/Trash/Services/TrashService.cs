using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.Holdings;
using JxFinance.Common.Settings;
using JxFinance.Common.Trash;
using JxFinance.Domain.Audit;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Trash;
using JxFinance.Endpoints.Transactions.Shared;
using JxFinance.Endpoints.Trash.GetTrash;
using JxFinance.Endpoints.Trash.Interfaces;
using JxFinance.Endpoints.Trash.Mappers;
using JxFinance.Endpoints.Trash.RestoreDeleted;
using JxFinance.Endpoints.Trash.RestoreTransactions;
using JxFinance.Endpoints.Trash.Shared;
using JxFinance.Infrastructure.Attachments;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Trash.Services;

[RegisterService<ITrashService>(LifeTime.Scoped)]
public sealed class TrashService(
    AppDbContext db,
    ICurrentUser currentUser,
    IClock clock,
    IInstanceSettingsStore settings,
    IHoldingLedger ledger,
    AttachmentStore attachmentFiles) : ITrashService
{
    private static readonly DomainError Gone =
        EntityLookup.NotFound("That record is no longer stored and cannot be restored.");

    private static readonly DomainError NothingDeleted =
        EntityLookup.NotFound("Nothing you deleted matches that record.");

    public async Task<PagedResponse<TrashEntryResponse>> GetPageAsync(
        GetTrashRequest request,
        CancellationToken cancellationToken)
    {
        var windowStart = DeletionEntry.WindowStart(clock.UtcNow);
        var query = db.DeletionEntries.Where(e => e.RestoredAt == null && e.DeletedAt >= windowStart);
        foreach (var disabled in TrashRestorers.Disabled(settings.Current))
        {
            query = query.Where(e => e.Kind != disabled);
        }

        var page = await query.ToPageAsync(
            request,
            sorted => sorted.OrderByDescending(e => e.DeletedAt).ThenByDescending(e => e.CreatedAt),
            cancellationToken);

        return page.Map(e => e.ToResponse());
    }

    public async Task<Result> RestoreAsync(RestoreDeletedRequest request, CancellationToken cancellationToken)
    {
        var found = await db.DeletionEntries
            .OrderByDescending(e => e.DeletedAt)
            .FindOrNotFoundAsync(
                e => e.Kind == request.Kind && e.EntityId == request.EntityId,
                NothingDeleted,
                cancellationToken);
        if (!found.TryGetValue(out var entry))
        {
            return found.Error;
        }

        await using var dbTransaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var restored = await RestoreEntryAsync(entry, cancellationToken);
        if (restored.IsFailure)
        {
            return restored;
        }

        await db.SaveChangesAsync(cancellationToken);
        await dbTransaction.CommitAsync(cancellationToken);

        return Result.Success();
    }

    public async Task<RestoreTransactionsResponse> RestoreTransactionsAsync(
        RestoreTransactionsRequest request,
        CancellationToken cancellationToken)
    {
        var ids = request.TransactionIds.Distinct().ToList();
        var newest = (await db.DeletionEntries
                .Where(e => e.Kind == TrashKind.Transaction && ids.Contains(e.EntityId))
                .ToListAsync(cancellationToken))
            .GroupBy(e => e.EntityId)
            .ToDictionary(g => g.Key, g => g.MaxBy(e => e.DeletedAt)!);

        await using var dbTransaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var refused = new List<TransactionRefusalResponse>();
        foreach (var id in ids)
        {
            var outcome = newest.TryGetValue(id, out var entry)
                ? await RestoreEntryAsync(entry, cancellationToken)
                : NothingDeleted;
            if (outcome.IsFailure)
            {
                refused.Add(new TransactionRefusalResponse(id, outcome.Error.Code, outcome.Error.Message));
            }
        }

        var accounts = db.ChangeTracker.Entries<Transaction>()
            .Where(e => e.State == EntityState.Modified)
            .Select(e => e.Entity.AccountId)
            .ToList();
        if (accounts.Count > 0)
        {
            db.Audit.Summarise(
                AuditAction.Restored,
                AuditEntityKind.Transaction,
                TrashLabel.Counted("Selection restored", (accounts.Count, "transaction", "transactions")),
                accounts.Count,
                accounts: accounts);
        }

        await db.SaveChangesAsync(cancellationToken);
        await dbTransaction.CommitAsync(cancellationToken);

        return new RestoreTransactionsResponse(ids.Count - refused.Count, refused);
    }

    private async Task<Result> RestoreEntryAsync(DeletionEntry entry, CancellationToken cancellationToken)
    {
        if (!TrashRestorers.IsEnabled(entry.Kind, settings.Current))
        {
            return new DomainError(
                ErrorCodes.FeatureDisabled,
                $"The {TrashRestorers.FeatureOf(entry.Kind)} feature is turned off for this installation.");
        }

        if (entry.RestoredAt is not null)
        {
            return Result.Success();
        }

        if (entry.DeletedAt < DeletionEntry.WindowStart(clock.UtcNow))
        {
            return new DomainError(
                ErrorCodes.RestoreExpired,
                $"This was deleted more than {DeletionEntry.RetentionDays} days ago and can no longer be restored.");
        }

        var restored = await RestoreRecordAsync(entry, cancellationToken);
        if (restored.IsSuccess)
        {
            entry.RestoredAt = clock.UtcNow;
        }

        return restored;
    }

    private async Task<Result> RestoreRecordAsync(DeletionEntry entry, CancellationToken cancellationToken)
    {
        if (TrashRestorers.Of(entry.Kind) is not { } restorer)
        {
            return Gone;
        }

        var restore = new TrashRestore(db, currentUser.Id, clock, ledger, attachmentFiles, entry, cancellationToken);
        if (await restorer.Load(restore) is not { } record)
        {
            return Gone;
        }

        if (await restorer.Check(restore, record) is { IsFailure: true } refused)
        {
            return refused;
        }

        if (!record.IsDeleted)
        {
            return Result.Success();
        }

        if (restorer.UsesChanges)
        {
            await db.Entry(entry).Collection(e => e.Changes).LoadAsync(cancellationToken);
        }

        if (await restorer.Restore(restore, record) is { IsFailure: true } blocked)
        {
            return blocked;
        }

        record.IsDeleted = false;

        return Result.Success();
    }
}
