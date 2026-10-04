using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.Sharing;
using JxFinance.Common.Trash;
using JxFinance.Domain.Audit;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Trash;
using JxFinance.Endpoints.TransactionGroups.AddToTransactionGroup;
using JxFinance.Endpoints.TransactionGroups.CreateTransactionGroup;
using JxFinance.Endpoints.TransactionGroups.GetTransactionGroupMembers;
using JxFinance.Endpoints.TransactionGroups.Interfaces;
using JxFinance.Endpoints.TransactionGroups.RenameTransactionGroup;
using JxFinance.Endpoints.TransactionGroups.Shared;
using JxFinance.Endpoints.Transactions.Interfaces;
using JxFinance.Endpoints.Transactions.Shared;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.TransactionGroups.Services;

[RegisterService<ITransactionGroupService>(LifeTime.Scoped)]
public sealed class TransactionGroupService(
    AppDbContext db,
    ICurrentUser currentUser,
    IDeletionRecorder deletions,
    ISharingGuard sharing,
    ITransactionQueryService transactions) : ITransactionGroupService
{
    private static readonly DomainError GroupNotFound = EntityLookup.NotFound("Transaction group not found.");

    private static readonly DomainError TransactionNotFound = EntityLookup.NotFound("Transaction not found.");

    private static readonly DomainError EnteredBySomeoneElse =
        new(ErrorCodes.AccessForbidden, "A personal group holds only transactions you entered.");

    private static readonly DomainError OwnerOnly =
        new(ErrorCodes.AccessForbidden, "Only the owner can ungroup a shared group.");

    private static readonly DomainError MemberTaken = new(
        ErrorCodes.TransactionGroupMemberTaken,
        "A transaction is already in another group. Remove it from that group first.");

    public async Task<IReadOnlyList<TransactionGroupResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var groups = await SummariesAsync(db.TransactionGroups, cancellationToken);
        return groups
            .Where(g => g.MemberCount > 0)
            .OrderByDescending(g => g.LastDate)
            .ThenBy(g => g.Name, StringComparer.CurrentCultureIgnoreCase)
            .ToList();
    }

    public async Task<Result<TransactionGroupResponse>> CreateAsync(
        CreateTransactionGroupRequest request,
        CancellationToken cancellationToken)
    {
        var ids = Typed(request.TransactionIds);
        var refused = await sharing.CheckAsync(request, cancellationToken)
            ?? await CheckMembersAsync(ids, null, currentUser.Id, SharingState.From(request), cancellationToken);
        if (refused is not null)
        {
            return refused;
        }

        var group = new TransactionGroup { Name = request.Name.Trim() };
        group.ApplySharing(request);

        await using var owned = db.Database.CurrentTransaction is null
            ? await db.Database.BeginTransactionAsync(cancellationToken)
            : null;
        db.TransactionGroups.Add(group);
        Summarise(group, AuditAction.Created, (ids.Count, "transaction", "transactions"));
        await db.SaveChangesAsync(cancellationToken);
        await SetGroupAsync(ids, group.Id, cancellationToken);
        if (owned is not null)
        {
            await owned.CommitAsync(cancellationToken);
        }

        return await SummaryAsync(group.Id, cancellationToken);
    }

    public async Task<Result<TransactionGroupResponse>> RenameAsync(
        RenameTransactionGroupRequest request,
        CancellationToken cancellationToken)
    {
        var groupId = new TransactionGroupId(request.Id);
        if (await db.TransactionGroups.FirstOrDefaultAsync(g => g.Id == groupId, cancellationToken) is not { } group)
        {
            return GroupNotFound;
        }

        if (await sharing.CheckAsync(group, request, cancellationToken) is { } sharingError)
        {
            return sharingError;
        }

        var next = SharingState.From(request);
        await using var dbTransaction = await db.Database.BeginTransactionAsync(cancellationToken);
        if (next != SharingState.Of(group))
        {
            var members = Members(groupId);
            if (next.HouseholdId is not null)
            {
                var accounts = await members.Select(t => t.AccountId).Distinct().ToListAsync(cancellationToken);
                if (await sharing.CheckReferencesAsync(next, new SharedReferences(accounts, [], []), cancellationToken) is { } notShared)
                {
                    return notShared;
                }
            }
            else
            {
                var ownerId = group.UserId;
                await members.Where(t => t.UserId != ownerId).ExecuteUpdateAsync(
                    setters => setters.SetProperty(t => t.GroupId, (TransactionGroupId?)null),
                    cancellationToken);
            }
        }

        group.Name = request.Name.Trim();
        group.ApplySharing(request);
        await db.SaveChangesAsync(cancellationToken);
        await dbTransaction.CommitAsync(cancellationToken);

        return await SummaryAsync(groupId, cancellationToken);
    }

    public async Task<Result> AddAsync(AddToTransactionGroupRequest request, CancellationToken cancellationToken)
    {
        var groupId = new TransactionGroupId(request.Id);
        if (await db.TransactionGroups.FirstOrDefaultAsync(g => g.Id == groupId, cancellationToken) is not { } group)
        {
            return GroupNotFound;
        }

        var ids = Typed(request.TransactionIds);
        if (await CheckMembersAsync(ids, groupId, group.UserId, SharingState.Of(group), cancellationToken) is { } refused)
        {
            return refused;
        }

        await SetGroupAsync(ids, groupId, cancellationToken);
        await RecordAsync(group, (ids.Count, "transaction added", "transactions added"), cancellationToken);
        return Result.Success();
    }

    public async Task<Result> RemoveAsync(Guid id, Guid transactionId, CancellationToken cancellationToken)
    {
        var groupId = new TransactionGroupId(id);
        if (await db.TransactionGroups.FirstOrDefaultAsync(g => g.Id == groupId, cancellationToken) is not { } group)
        {
            return GroupNotFound;
        }

        var memberId = new TransactionId(transactionId);
        var removed = await db.Transactions
            .Where(t => t.Id == memberId && t.GroupId == groupId)
            .ExecuteUpdateAsync(setters => setters.SetProperty(t => t.GroupId, (TransactionGroupId?)null), cancellationToken);
        if (removed == 0)
        {
            return TransactionNotFound;
        }

        await RecordAsync(group, (removed, "transaction removed", "transactions removed"), cancellationToken);
        return Result.Success();
    }

    public async Task<Result<Guid>> UngroupAsync(Guid id, CancellationToken cancellationToken)
    {
        var groupId = new TransactionGroupId(id);
        if (await db.TransactionGroups.FirstOrDefaultAsync(g => g.Id == groupId, cancellationToken) is not { } group)
        {
            return GroupNotFound;
        }

        if (group.UserId != currentUser.Id)
        {
            return OwnerOnly;
        }

        await using var dbTransaction = await db.Database.BeginTransactionAsync(cancellationToken);

        var members = Members(groupId);
        var memberIds = await members.Select(t => t.Id.Value).ToListAsync(cancellationToken);
        var entry = deletions.Record(
            TrashKind.TransactionGroup,
            id,
            TrashLabel.Counted(group.Name, (memberIds.Count, "transaction", "transactions")));
        entry.Remember(DeletionChangeKind.GroupMember, memberIds);

        await members.ExecuteUpdateAsync(
            setters => setters.SetProperty(t => t.GroupId, (TransactionGroupId?)null),
            cancellationToken);
        db.TransactionGroups.Remove(group);
        await db.SaveChangesAsync(cancellationToken);
        await dbTransaction.CommitAsync(cancellationToken);

        return id;
    }

    public async Task<Result<GroupMembersResponse>> GetMembersAsync(
        GetTransactionGroupMembersRequest request,
        CancellationToken cancellationToken)
    {
        var groupId = new TransactionGroupId(request.Id);
        if (!await db.TransactionGroups.AnyAsync(g => g.Id == groupId, cancellationToken))
        {
            return GroupNotFound;
        }

        var members = await transactions.ListGroupMembersAsync(groupId, request, BulkRules.MaxTransactions + 1, cancellationToken);
        return new GroupMembersResponse(
            [.. members.Take(BulkRules.MaxTransactions)],
            members.Count > BulkRules.MaxTransactions);
    }

    private static List<TransactionId> Typed(IReadOnlyList<Guid> ids) =>
        [.. ids.Distinct().Select(id => new TransactionId(id))];

    private IQueryable<Transaction> Members(TransactionGroupId groupId) =>
        db.Transactions
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .Where(t => t.GroupId == groupId);

    private async Task<DomainError?> CheckMembersAsync(
        List<TransactionId> ids,
        TransactionGroupId? target,
        Guid ownerId,
        SharingState sharingState,
        CancellationToken cancellationToken)
    {
        var rows = await db.Transactions
            .Where(t => ids.Contains(t.Id))
            .Select(t => new { t.UserId, t.AccountId, t.GroupId })
            .ToListAsync(cancellationToken);
        if (rows.Count != ids.Count)
        {
            return TransactionNotFound;
        }

        if (sharingState.HouseholdId is null && rows.Any(r => r.UserId != ownerId))
        {
            return EnteredBySomeoneElse;
        }

        var accounts = rows.Select(r => r.AccountId).Distinct().ToList();
        if (await sharing.CheckReferencesAsync(sharingState, new SharedReferences(accounts, [], []), cancellationToken) is { } notShared)
        {
            return notShared;
        }

        var inOthers = rows
            .Where(r => r.GroupId is { } groupId && groupId != target)
            .Select(r => (Group: r.GroupId!.Value, r.UserId))
            .ToList();
        if (inOthers.Count == 0)
        {
            return null;
        }

        var otherIds = inOthers.Select(r => r.Group).Distinct().ToList();
        var visible = await db.TransactionGroups
            .Where(g => otherIds.Contains(g.Id))
            .Select(g => g.Id)
            .ToListAsync(cancellationToken);
        var owners = await db.TransactionGroups
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .Where(g => otherIds.Contains(g.Id))
            .ToDictionaryAsync(g => g.Id, g => g.UserId, cancellationToken);

        return inOthers.Any(r => visible.Contains(r.Group) || owners.GetValueOrDefault(r.Group) == r.UserId)
            ? MemberTaken
            : null;
    }

    private Task<int> SetGroupAsync(List<TransactionId> ids, TransactionGroupId groupId, CancellationToken cancellationToken)
    {
        TransactionGroupId? grouped = groupId;
        return db.Transactions
            .Where(t => ids.Contains(t.Id))
            .ExecuteUpdateAsync(setters => setters.SetProperty(t => t.GroupId, grouped), cancellationToken);
    }

    private void Summarise(TransactionGroup group, AuditAction action, (int Count, string One, string Many) rows) =>
        db.Audit.Summarise(
            action,
            AuditEntityKind.TransactionGroup,
            TrashLabel.Counted(group.Name, rows),
            rows.Count,
            group.Id.Value,
            household: group.HouseholdId);

    private async Task RecordAsync(TransactionGroup group, (int Count, string One, string Many) rows, CancellationToken cancellationToken)
    {
        if (group.HouseholdId is null)
        {
            return;
        }

        Summarise(group, AuditAction.Updated, rows);
        await db.SaveChangesAsync(cancellationToken);
    }

    private async Task<TransactionGroupResponse> SummaryAsync(TransactionGroupId groupId, CancellationToken cancellationToken) =>
        (await SummariesAsync(db.TransactionGroups.Where(g => g.Id == groupId), cancellationToken)).Single();

    private async Task<List<TransactionGroupResponse>> SummariesAsync(
        IQueryable<TransactionGroup> groups,
        CancellationToken cancellationToken)
    {
        var rows = await groups
            .Select(g => new
            {
                g.Id,
                g.Name,
                g.Scope,
                g.HouseholdId,
                g.UserId,
                Count = db.Transactions.Count(t => t.GroupId == g.Id),
                First = db.Transactions.Where(t => t.GroupId == g.Id).Min(t => (DateOnly?)t.Date),
                Last = db.Transactions.Where(t => t.GroupId == g.Id).Max(t => (DateOnly?)t.Date),
            })
            .ToListAsync(cancellationToken);

        return rows
            .Select(g => new TransactionGroupResponse(
                g.Id.Value,
                g.Name,
                g.Count,
                g.First ?? default,
                g.Last ?? default,
                g.Scope,
                g.HouseholdId?.Value,
                g.UserId == currentUser.Id))
            .ToList();
    }
}
