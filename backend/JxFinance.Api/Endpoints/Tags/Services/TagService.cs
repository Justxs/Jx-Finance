using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.Trash;
using JxFinance.Domain.Common;
using JxFinance.Domain.Tags;
using JxFinance.Domain.Trash;
using JxFinance.Endpoints.Tags.Interfaces;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Tags.Services;

[RegisterService<ITagService>(LifeTime.Scoped)]
public sealed class TagService(AppDbContext db, ICurrentUser currentUser, IDeletionRecorder deletions) : ITagService
{
    public async Task<IReadOnlyList<Tag>> GetAllAsync(CancellationToken cancellationToken) =>
        await db.Tags.OrderBy(t => t.Name).ToListAsync(cancellationToken);

    public async Task<Result<Tag>> CreateAsync(Tag tag, CancellationToken cancellationToken)
    {
        var error = await ValidateAsync(tag, null, cancellationToken);
        if (error is not null)
        {
            return error;
        }

        db.Tags.Add(tag);
        await db.SaveChangesAsync(cancellationToken);

        return tag;
    }

    public async Task<Result<Tag>> UpdateAsync(Guid id, Action<Tag> apply, CancellationToken cancellationToken)
    {
        var tagId = new TagId(id);
        var tag = await db.Tags.FirstOrDefaultAsync(t => t.Id == tagId, cancellationToken);
        if (tag is null)
        {
            return new DomainError(ErrorCodes.ResourceNotFound, "Tag not found.");
        }

        var (previousScope, previousHouseholdId) = (tag.Scope, tag.HouseholdId);
        apply(tag);

        var error = await ValidateAsync(tag, tagId, cancellationToken);
        if (error is not null)
        {
            return error;
        }

        if (tag.UserId != currentUser.Id &&
            (tag.Scope != previousScope || tag.HouseholdId != previousHouseholdId))
        {
            return new DomainError(ErrorCodes.AccessForbidden, "Only the owner can change sharing.");
        }

        await db.SaveChangesAsync(cancellationToken);

        return tag;
    }

    public async Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var tagId = new TagId(id);
        var tag = await db.Tags.FirstOrDefaultAsync(t => t.Id == tagId, cancellationToken);
        if (tag is null)
        {
            return new DomainError(ErrorCodes.ResourceNotFound, "Tag not found.");
        }

        if (tag.UserId != currentUser.Id)
        {
            return new DomainError(ErrorCodes.AccessForbidden, "Only the owner can delete a shared tag.");
        }

        await using var dbTransaction = await db.Database.BeginTransactionAsync(cancellationToken);

        var linked = await db.TransactionTags
            .Where(t => t.TagId == tagId)
            .Select(t => t.TransactionId)
            .ToListAsync(cancellationToken);
        var live = await db.Transactions
            .IgnoreQueryFilters()
            .CountAsync(t => linked.Contains(t.Id) && !t.IsDeleted, cancellationToken);
        var entry = deletions.Record(
            TrashKind.Tag,
            id,
            TrashLabel.Counted(tag.Name, (live, "transaction", "transactions")));
        entry.Remember(DeletionChangeKind.TransactionTag, linked.Select(t => t.Value));

        await db.TransactionTags.Where(t => t.TagId == tagId).ExecuteDeleteAsync(cancellationToken);
        db.Tags.Remove(tag);
        await db.SaveChangesAsync(cancellationToken);

        await dbTransaction.CommitAsync(cancellationToken);

        return id;
    }

    private async Task<DomainError?> ValidateAsync(Tag tag, TagId? excluding, CancellationToken cancellationToken)
    {
        if (tag.Scope == Scope.Shared && tag.HouseholdId is { } householdId)
        {
            var isMember = await db.HouseholdMemberships.AnyAsync(
                m => m.HouseholdId == householdId && m.UserId == currentUser.Id,
                cancellationToken);
            if (!isMember)
            {
                return new DomainError(ErrorCodes.HouseholdNotMember, "You are not a member of that household.");
            }
        }

        var ownerId = tag.UserId == Guid.Empty ? currentUser.Id : tag.UserId;
        var pattern = LikePattern.Exactly(tag.Name);
        var excludedId = excluding ?? default;
        var hasExcluded = excluding.HasValue;
        var taken = await db.Tags
            .IgnoreQueryFilters()
            .AnyAsync(
                t => !t.IsDeleted
                    && t.UserId == ownerId
                    && EF.Functions.ILike(t.Name, pattern, LikePattern.Escape)
                    && (!hasExcluded || t.Id != excludedId),
                cancellationToken);

        return taken
            ? new DomainError(ErrorCodes.ConflictDuplicate, $"You already have a tag named \"{tag.Name}\".")
            : null;
    }
}
