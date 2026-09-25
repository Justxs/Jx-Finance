using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.Sharing;
using JxFinance.Common.Trash;
using JxFinance.Domain.Common;
using JxFinance.Domain.Households;
using JxFinance.Domain.Trash;
using JxFinance.Endpoints.Households.AddMember;
using JxFinance.Endpoints.Households.CreateHousehold;
using JxFinance.Endpoints.Households.Interfaces;
using JxFinance.Endpoints.Households.Mappers;
using JxFinance.Endpoints.Households.Shared;
using JxFinance.Endpoints.Households.UpdateHousehold;
using JxFinance.Endpoints.Households.UpdateMemberRole;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Households.Services;

[RegisterService<IHouseholdService>(LifeTime.Scoped)]
public sealed class HouseholdService(
    AppDbContext db,
    ICurrentUser currentUser,
    IClock clock,
    IDeletionRecorder deletions) : IHouseholdService
{
    private static readonly DomainError MembershipNotFound = EntityLookup.NotFound("Membership not found.");

    private static readonly DomainError LastOwner = new(ErrorCodes.HouseholdLastOwner, "A household needs at least one owner.");

    public async Task<IReadOnlyList<HouseholdResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var households = await db.Households.OrderBy(h => h.Name).ToListAsync(cancellationToken);

        return await ToResponsesAsync(households, cancellationToken);
    }

    public async Task<Result<HouseholdResponse>> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var found = await FindAsync(id, cancellationToken);
        if (!found.TryGetValue(out var household))
        {
            return found.Error;
        }

        return await ToResponseAsync(household, cancellationToken);
    }

    public async Task<Result<HouseholdResponse>> CreateAsync(
        CreateHouseholdRequest request,
        CancellationToken cancellationToken)
    {
        var household = request.ToEntity();
        db.Households.Add(household);
        db.HouseholdMemberships.Add(new HouseholdMembership
        {
            HouseholdId = household.Id,
            UserId = currentUser.Id,
            Role = HouseholdRole.Owner,
        });

        await db.SaveChangesAsync(cancellationToken);

        return await ToResponseAsync(household, cancellationToken);
    }

    public async Task<Result<HouseholdResponse>> UpdateAsync(
        UpdateHouseholdRequest request,
        CancellationToken cancellationToken)
    {
        var owned = await FindOwnedAsync(request.Id, cancellationToken);
        if (!owned.TryGetValue(out var household))
        {
            return owned.Error;
        }

        request.ApplyTo(household);
        await db.SaveChangesAsync(cancellationToken);

        return await ToResponseAsync(household, cancellationToken);
    }

    public async Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var owned = await FindOwnedAsync(id, cancellationToken);
        if (!owned.TryGetValue(out var household))
        {
            return owned.Error;
        }

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await RecordDeletionAsync(household, cancellationToken);
        await MakePersonalAsync(household.Id, null, cancellationToken);
        db.Households.Remove(household);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return id;
    }

    public async Task<Result<HouseholdResponse>> AddMemberAsync(
        AddMemberRequest request,
        CancellationToken cancellationToken)
    {
        var owned = await FindOwnedAsync(request.Id, cancellationToken);
        if (!owned.TryGetValue(out var household))
        {
            return owned.Error;
        }

        var normalizedEmail = request.Email.Trim().ToUpperInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.NormalizedEmail == normalizedEmail, cancellationToken);
        if (user is null)
        {
            return new DomainError(ErrorCodes.ReferenceNotFound, "No user with that email exists.");
        }

        var alreadyMember = await db.HouseholdMemberships
            .AnyAsync(m => m.HouseholdId == household.Id && m.UserId == user.Id, cancellationToken);
        if (alreadyMember)
        {
            return new DomainError(ErrorCodes.ConflictDuplicate, "That user is already a member.");
        }

        db.HouseholdMemberships.Add(new HouseholdMembership
        {
            HouseholdId = household.Id,
            UserId = user.Id,
            Role = request.Role,
        });
        await db.SaveChangesAsync(cancellationToken);

        return await ToResponseAsync(household, cancellationToken);
    }

    public async Task<Result<HouseholdResponse>> UpdateMemberRoleAsync(
        UpdateMemberRoleRequest request,
        CancellationToken cancellationToken)
    {
        var owned = await FindOwnedAsync(request.Id, cancellationToken);
        if (!owned.TryGetValue(out var household))
        {
            return owned.Error;
        }

        if (await FindMemberAsync(household.Id, request.UserId, cancellationToken) is not { } membership)
        {
            return MembershipNotFound;
        }

        if (membership.Role == HouseholdRole.Owner
            && request.Role != HouseholdRole.Owner
            && !await HasAnotherOwnerAsync(household.Id, membership.UserId, cancellationToken))
        {
            return LastOwner;
        }

        membership.Role = request.Role;
        await db.SaveChangesAsync(cancellationToken);

        return await ToResponseAsync(household, cancellationToken);
    }

    public async Task<Result<HouseholdResponse>> RemoveMemberAsync(
        Guid householdId,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var owned = await FindOwnedAsync(householdId, cancellationToken);
        if (!owned.TryGetValue(out var household))
        {
            return owned.Error;
        }

        if (await FindMemberAsync(household.Id, userId, cancellationToken) is not { } membership)
        {
            return MembershipNotFound;
        }

        if (membership.Role == HouseholdRole.Owner
            && !await HasAnotherOwnerAsync(household.Id, membership.UserId, cancellationToken))
        {
            return LastOwner;
        }

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await MakePersonalAsync(household.Id, membership.UserId, cancellationToken);
        db.HouseholdMemberships.Remove(membership);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return await ToResponseAsync(household, cancellationToken);
    }

    private async Task RecordDeletionAsync(Household household, CancellationToken cancellationToken)
    {
        var householdId = household.Id;
        var shared = new List<(ShareableSet Set, IReadOnlyList<SharedRow> Rows)>();
        foreach (var set in ShareableSet.All)
        {
            shared.Add((set, await set.InHouseholdAsync(db, householdId, cancellationToken)));
        }

        var entry = deletions.Record(
            TrashKind.Household,
            householdId.Value,
            TrashLabel.Counted(
                household.Name,
                [.. shared.Select(s => (s.Rows.Count(r => !r.IsDeleted), s.Set.One, s.Set.Many))]));
        foreach (var (set, rows) in shared)
        {
            entry.Remember(set.ShareKind, rows.Select(r => r.Id));
        }
    }

    private async Task MakePersonalAsync(HouseholdId householdId, Guid? ownerId, CancellationToken cancellationToken)
    {
        var now = clock.UtcNow;
        foreach (var set in ShareableSet.All)
        {
            await set.MakePersonalAsync(db, householdId, ownerId, now, cancellationToken);
        }
    }

    private Task<Result<Household>> FindAsync(Guid id, CancellationToken cancellationToken)
    {
        var householdId = new HouseholdId(id);
        return db.Households.FindOrNotFoundAsync(h => h.Id == householdId, "Household not found.", cancellationToken);
    }

    private async Task<Result<Household>> FindOwnedAsync(Guid id, CancellationToken cancellationToken)
    {
        var found = await FindAsync(id, cancellationToken);
        if (found.TryGetValue(out var household) && !await IsOwnerAsync(household.Id, cancellationToken))
        {
            return new DomainError(ErrorCodes.AccessForbidden, "Only a household owner can do this.");
        }

        return found;
    }

    private Task<HouseholdMembership?> FindMemberAsync(
        HouseholdId householdId,
        Guid userId,
        CancellationToken cancellationToken) =>
        db.HouseholdMemberships.FirstOrDefaultAsync(m => m.HouseholdId == householdId && m.UserId == userId, cancellationToken);

    private Task<bool> IsOwnerAsync(HouseholdId householdId, CancellationToken cancellationToken) =>
        db.HouseholdMemberships.AnyAsync(
            m => m.HouseholdId == householdId && m.UserId == currentUser.Id && m.Role == HouseholdRole.Owner,
            cancellationToken);

    private Task<bool> HasAnotherOwnerAsync(
        HouseholdId householdId,
        Guid excludingUserId,
        CancellationToken cancellationToken) =>
        db.HouseholdMemberships.AnyAsync(
            m => m.HouseholdId == householdId && m.UserId != excludingUserId && m.Role == HouseholdRole.Owner,
            cancellationToken);

    private async Task<HouseholdResponse> ToResponseAsync(Household household, CancellationToken cancellationToken) =>
        (await ToResponsesAsync([household], cancellationToken))[0];

    private async Task<List<HouseholdResponse>> ToResponsesAsync(
        List<Household> households,
        CancellationToken cancellationToken)
    {
        if (households.Count == 0)
        {
            return [];
        }

        var ids = households.Select(h => h.Id).ToList();
        var rows = await (
            from membership in db.HouseholdMemberships.Where(m => ids.Contains(m.HouseholdId))
            join candidate in db.Users on membership.UserId equals candidate.Id into matched
            from user in matched.DefaultIfEmpty()
            select new { Membership = membership, User = user })
            .ToListAsync(cancellationToken);

        var byHousehold = rows
            .GroupBy(row => row.Membership.HouseholdId)
            .ToDictionary(group => group.Key, group => group.ToList());

        return households
            .Select(household =>
            {
                var members = byHousehold.GetValueOrDefault(household.Id, []);
                var myRole = members
                    .Find(row => row.Membership.UserId == currentUser.Id)?
                    .Membership.Role ?? HouseholdRole.Member;
                return household.ToResponse(myRole, members.Select(row => row.Membership.ToResponse(row.User)).ToList());
            })
            .ToList();
    }
}
