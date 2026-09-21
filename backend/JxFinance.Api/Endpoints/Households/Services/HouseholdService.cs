using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Domain.Households;
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
    HouseholdMapper mapper,
    IClock clock) : IHouseholdService
{
    public async Task<IReadOnlyList<HouseholdResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var households = await db.Households.OrderBy(h => h.Name).ToListAsync(cancellationToken);
        var responses = new List<HouseholdResponse>();
        foreach (var household in households)
        {
            responses.Add(await ToResponseAsync(household, cancellationToken));
        }

        return responses;
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

    public async Task<HouseholdResponse> CreateAsync(
        CreateHouseholdRequest request,
        CancellationToken cancellationToken)
    {
        var household = mapper.ToEntity(request);
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

        mapper.Apply(request, household);
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

        var membership = await db.HouseholdMemberships
            .FirstOrDefaultAsync(m => m.HouseholdId == household.Id && m.UserId == request.UserId, cancellationToken);
        if (membership is null)
        {
            return new DomainError(ErrorCodes.ResourceNotFound, "Membership not found.");
        }

        if (membership.Role == HouseholdRole.Owner
            && request.Role != HouseholdRole.Owner
            && !await HasAnotherOwnerAsync(household.Id, membership.UserId, cancellationToken))
        {
            return new DomainError(
                ErrorCodes.HouseholdLastOwner,
                "A household needs at least one owner.");
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

        var membership = await db.HouseholdMemberships
            .FirstOrDefaultAsync(m => m.HouseholdId == household.Id && m.UserId == userId, cancellationToken);
        if (membership is null)
        {
            return new DomainError(ErrorCodes.ResourceNotFound, "Membership not found.");
        }

        if (membership.Role == HouseholdRole.Owner
            && !await HasAnotherOwnerAsync(household.Id, membership.UserId, cancellationToken))
        {
            return new DomainError(
                ErrorCodes.HouseholdLastOwner,
                "A household needs at least one owner.");
        }

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await MakePersonalAsync(household.Id, membership.UserId, cancellationToken);
        db.HouseholdMemberships.Remove(membership);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return await ToResponseAsync(household, cancellationToken);
    }

    private async Task MakePersonalAsync(HouseholdId householdId, Guid? ownerId, CancellationToken cancellationToken)
    {
        var now = clock.UtcNow;

        await db.Accounts
            .Where(a => a.HouseholdId == householdId && (ownerId == null || a.UserId == ownerId))
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(a => a.Scope, Scope.Personal)
                    .SetProperty(a => a.HouseholdId, (HouseholdId?)null)
                    .SetProperty(a => a.UpdatedAt, now),
                cancellationToken);

        await db.Categories
            .Where(c => c.HouseholdId == householdId && (ownerId == null || c.UserId == ownerId))
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(c => c.Scope, Scope.Personal)
                    .SetProperty(c => c.HouseholdId, (HouseholdId?)null)
                    .SetProperty(c => c.UpdatedAt, now),
                cancellationToken);

        await db.Tags
            .Where(t => t.HouseholdId == householdId && (ownerId == null || t.UserId == ownerId))
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(t => t.Scope, Scope.Personal)
                    .SetProperty(t => t.HouseholdId, (HouseholdId?)null)
                    .SetProperty(t => t.UpdatedAt, now),
                cancellationToken);
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

    private async Task<HouseholdResponse> ToResponseAsync(Household household, CancellationToken cancellationToken)
    {
        var memberships = await db.HouseholdMemberships
            .Where(m => m.HouseholdId == household.Id)
            .ToListAsync(cancellationToken);

        var userIds = memberships.Select(m => m.UserId).ToList();
        var users = await db.Users
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, cancellationToken);

        var members = memberships
            .Select(m => mapper.ToMember(m, users.GetValueOrDefault(m.UserId)))
            .ToList();

        var myRole = memberships.FirstOrDefault(m => m.UserId == currentUser.Id)?.Role ?? HouseholdRole.Member;

        return mapper.FromEntity(household, myRole, members);
    }
}
