using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.Sharing;
using JxFinance.Common.Trash;
using JxFinance.Domain.Common;
using JxFinance.Domain.Tags;
using JxFinance.Domain.Trash;
using JxFinance.Endpoints.Tags.CreateTag;
using JxFinance.Endpoints.Tags.Interfaces;
using JxFinance.Endpoints.Tags.Mappers;
using JxFinance.Endpoints.Tags.Shared;
using JxFinance.Endpoints.Tags.UpdateTag;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Tags.Services;

[RegisterService<ITagService>(LifeTime.Scoped)]
public sealed class TagService(
    AppDbContext db,
    ICurrentUser currentUser,
    ISharingGuard sharing,
    IDeletionRecorder deletions) : ITagService
{
    private static readonly DomainError NotFound = EntityLookup.NotFound("Tag not found.");

    public async Task<IReadOnlyList<TagResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var tags = await db.Tags.OrderBy(t => t.Name).ToListAsync(cancellationToken);
        return tags.Select(t => t.ToResponse()).ToList();
    }

    public async Task<Result<TagResponse>> CreateAsync(CreateTagRequest request, CancellationToken cancellationToken)
    {
        var error = await ValidateAsync(request, null, cancellationToken);
        if (error is not null)
        {
            return error;
        }

        var tag = request.ToEntity();
        db.Tags.Add(tag);
        await db.SaveChangesAsync(cancellationToken);

        return tag.ToResponse();
    }

    public async Task<Result<TagResponse>> UpdateAsync(UpdateTagRequest request, CancellationToken cancellationToken)
    {
        var tagId = new TagId(request.Id);
        if (await db.Tags.FirstOrDefaultAsync(t => t.Id == tagId, cancellationToken) is not { } tag)
        {
            return NotFound;
        }

        var error = await ValidateAsync(request, tag, cancellationToken);
        if (error is not null)
        {
            return error;
        }

        request.ApplyTo(tag);
        await db.SaveChangesAsync(cancellationToken);

        return tag.ToResponse();
    }

    public async Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var tagId = new TagId(id);
        if (await db.Tags.FirstOrDefaultAsync(t => t.Id == tagId, cancellationToken) is not { } tag)
        {
            return NotFound;
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
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .CountAsync(t => linked.Contains(t.Id), cancellationToken);
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

    private async Task<DomainError?> ValidateAsync(
        ITagInput input,
        Tag? existing,
        CancellationToken cancellationToken)
    {
        var sharingError = existing is null
            ? await sharing.CheckAsync(input, cancellationToken)
            : await sharing.CheckAsync(existing, input, cancellationToken);
        if (sharingError is not null)
        {
            return sharingError;
        }

        var ownerId = existing?.UserId ?? currentUser.Id;
        var name = input.NormalizedName();
        var pattern = LikePattern.Exactly(name);
        var excludedId = existing?.Id ?? default;
        var hasExcluded = existing is not null;
        var taken = await db.Tags
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .AnyAsync(
                t => t.UserId == ownerId
                    && EF.Functions.ILike(t.Name, pattern, LikePattern.Escape)
                    && (!hasExcluded || t.Id != excludedId),
                cancellationToken);

        return taken
            ? new DomainError(ErrorCodes.ConflictDuplicate, $"You already have a tag named \"{name}\".")
            : null;
    }
}
