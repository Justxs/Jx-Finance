using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.Trash;
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
    ITransactionService transactions) : ITransactionGroupService
{
    private static readonly DomainError GroupNotFound = EntityLookup.NotFound("Transaction group not found.");

    private static readonly DomainError TransactionNotFound = EntityLookup.NotFound("Transaction not found.");

    private static readonly DomainError EnteredBySomeoneElse =
        new(ErrorCodes.AccessForbidden, "Only transactions you entered can be grouped.");

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
        if (await CheckMembersAsync(ids, null, cancellationToken) is { } refused)
        {
            return refused;
        }

        var group = new TransactionGroup { Name = request.Name.Trim() };

        await using var dbTransaction = await db.Database.BeginTransactionAsync(cancellationToken);
        db.TransactionGroups.Add(group);
        await db.SaveChangesAsync(cancellationToken);
        await SetGroupAsync(ids, group.Id, cancellationToken);
        await dbTransaction.CommitAsync(cancellationToken);

        return await SummaryAsync(group.Id, cancellationToken);
    }

    public async Task<Result<TransactionGroupResponse>> RenameAsync(
        RenameTransactionGroupRequest request,
        CancellationToken cancellationToken)
    {
        var groupId = new TransactionGroupId(request.Id);
        var renamed = await db.UpdateOrNotFoundAsync<TransactionGroup>(
            g => g.Id == groupId,
            GroupNotFound,
            g => g.Name = request.Name.Trim(),
            cancellationToken);
        if (renamed.IsFailure)
        {
            return renamed.Error;
        }

        return await SummaryAsync(groupId, cancellationToken);
    }

    public async Task<Result> AddAsync(AddToTransactionGroupRequest request, CancellationToken cancellationToken)
    {
        var groupId = new TransactionGroupId(request.Id);
        if (!await db.TransactionGroups.AnyAsync(g => g.Id == groupId, cancellationToken))
        {
            return GroupNotFound;
        }

        var ids = Typed(request.TransactionIds);
        if (await CheckMembersAsync(ids, groupId, cancellationToken) is { } refused)
        {
            return refused;
        }

        await SetGroupAsync(ids, groupId, cancellationToken);
        return Result.Success();
    }

    public async Task<Result> RemoveAsync(Guid id, Guid transactionId, CancellationToken cancellationToken)
    {
        var groupId = new TransactionGroupId(id);
        if (!await db.TransactionGroups.AnyAsync(g => g.Id == groupId, cancellationToken))
        {
            return GroupNotFound;
        }

        var memberId = new TransactionId(transactionId);
        var removed = await db.Transactions
            .Where(t => t.Id == memberId && t.GroupId == groupId)
            .ExecuteUpdateAsync(setters => setters.SetProperty(t => t.GroupId, (TransactionGroupId?)null), cancellationToken);

        return removed == 0 ? TransactionNotFound : Result.Success();
    }

    public async Task<Result<Guid>> UngroupAsync(Guid id, CancellationToken cancellationToken)
    {
        var groupId = new TransactionGroupId(id);
        if (await db.TransactionGroups.FirstOrDefaultAsync(g => g.Id == groupId, cancellationToken) is not { } group)
        {
            return GroupNotFound;
        }

        await using var dbTransaction = await db.Database.BeginTransactionAsync(cancellationToken);

        var members = OwnMembers(groupId);
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

    private IQueryable<Transaction> OwnMembers(TransactionGroupId groupId)
    {
        var ownerId = currentUser.Id;
        return db.Transactions
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .Where(t => t.GroupId == groupId && t.UserId == ownerId);
    }

    private async Task<DomainError?> CheckMembersAsync(
        List<TransactionId> ids,
        TransactionGroupId? target,
        CancellationToken cancellationToken)
    {
        var rows = await db.Transactions
            .Where(t => ids.Contains(t.Id))
            .Select(t => new { t.UserId, t.GroupId })
            .ToListAsync(cancellationToken);
        if (rows.Count != ids.Count)
        {
            return TransactionNotFound;
        }

        if (rows.Any(r => r.UserId != currentUser.Id))
        {
            return EnteredBySomeoneElse;
        }

        var otherGroups = rows
            .Select(r => r.GroupId)
            .OfType<TransactionGroupId>()
            .Where(groupId => groupId != target)
            .Distinct()
            .ToList();
        var taken = otherGroups.Count > 0
            && await db.TransactionGroups.AnyAsync(g => otherGroups.Contains(g.Id), cancellationToken);

        return taken ? MemberTaken : null;
    }

    private Task<int> SetGroupAsync(List<TransactionId> ids, TransactionGroupId groupId, CancellationToken cancellationToken)
    {
        TransactionGroupId? grouped = groupId;
        return db.Transactions
            .Where(t => ids.Contains(t.Id))
            .ExecuteUpdateAsync(setters => setters.SetProperty(t => t.GroupId, grouped), cancellationToken);
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
                Count = db.Transactions.Count(t => t.GroupId == g.Id),
                First = db.Transactions.Where(t => t.GroupId == g.Id).Min(t => (DateOnly?)t.Date),
                Last = db.Transactions.Where(t => t.GroupId == g.Id).Max(t => (DateOnly?)t.Date),
            })
            .ToListAsync(cancellationToken);

        return rows
            .Select(g => new TransactionGroupResponse(g.Id.Value, g.Name, g.Count, g.First ?? default, g.Last ?? default))
            .ToList();
    }
}
