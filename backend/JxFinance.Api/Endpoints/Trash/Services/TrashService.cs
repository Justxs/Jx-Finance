using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.Holdings;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Domain.Trash;
using JxFinance.Endpoints.Trash.GetTrash;
using JxFinance.Endpoints.Trash.Interfaces;
using JxFinance.Endpoints.Trash.Mappers;
using JxFinance.Endpoints.Trash.RestoreDeleted;
using JxFinance.Endpoints.Trash.Shared;
using JxFinance.Infrastructure.Attachments;
using JxFinance.Infrastructure.Data;

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
                "Nothing you deleted matches that record.",
                cancellationToken);
        if (!found.TryGetValue(out var entry))
        {
            return found.Error;
        }

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

        await using var dbTransaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var restored = await RestoreRecordAsync(entry, cancellationToken);
        if (restored.IsFailure)
        {
            return restored;
        }

        entry.RestoredAt = clock.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        await dbTransaction.CommitAsync(cancellationToken);

        return Result.Success();
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
