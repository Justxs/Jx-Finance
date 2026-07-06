using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Domain.Households;
using JxFinance.Endpoints.Households.AddMember;
using JxFinance.Endpoints.Households.CreateHousehold;
using JxFinance.Endpoints.Households.UpdateHousehold;
using JxFinance.Endpoints.Households.UpdateMemberRole;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Households;

public sealed class HouseholdService(AppDbContext db, ICurrentUser currentUser) : IHouseholdService
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
        var household = await FindAsync(id, cancellationToken);
        if (household is null)
        {
            return Result<HouseholdResponse>.Failure(ErrorCodes.NotFound, "Household not found.");
        }

        return Result<HouseholdResponse>.Success(await ToResponseAsync(household, cancellationToken));
    }

    public async Task<HouseholdResponse> CreateAsync(
        CreateHouseholdRequest request,
        CancellationToken cancellationToken)
    {
        var household = new Household { Name = request.Name.Trim() };
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
        var household = await FindAsync(request.Id, cancellationToken);
        if (household is null)
        {
            return Result<HouseholdResponse>.Failure(ErrorCodes.NotFound, "Household not found.");
        }

        if (!await IsOwnerAsync(household.Id, cancellationToken))
        {
            return Result<HouseholdResponse>.Failure(ErrorCodes.Forbidden, "Only a household owner can do this.");
        }

        household.Name = request.Name.Trim();
        await db.SaveChangesAsync(cancellationToken);

        return Result<HouseholdResponse>.Success(await ToResponseAsync(household, cancellationToken));
    }

    public async Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var household = await FindAsync(id, cancellationToken);
        if (household is null)
        {
            return Result<Guid>.Failure(ErrorCodes.NotFound, "Household not found.");
        }

        if (!await IsOwnerAsync(household.Id, cancellationToken))
        {
            return Result<Guid>.Failure(ErrorCodes.Forbidden, "Only a household owner can do this.");
        }

        await db.Accounts
            .Where(a => a.HouseholdId == household.Id)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(a => a.Scope, Scope.Personal)
                    .SetProperty(a => a.HouseholdId, (HouseholdId?)null)
                    .SetProperty(a => a.UpdatedAt, DateTimeOffset.UtcNow),
                cancellationToken);

        await db.Categories
            .Where(c => c.HouseholdId == household.Id)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(c => c.Scope, Scope.Personal)
                    .SetProperty(c => c.HouseholdId, (HouseholdId?)null)
                    .SetProperty(c => c.UpdatedAt, DateTimeOffset.UtcNow),
                cancellationToken);

        db.Households.Remove(household);
        await db.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(id);
    }

    public async Task<Result<HouseholdResponse>> AddMemberAsync(
        AddMemberRequest request,
        CancellationToken cancellationToken)
    {
        var household = await FindAsync(request.Id, cancellationToken);
        if (household is null)
        {
            return Result<HouseholdResponse>.Failure(ErrorCodes.NotFound, "Household not found.");
        }

        if (!await IsOwnerAsync(household.Id, cancellationToken))
        {
            return Result<HouseholdResponse>.Failure(ErrorCodes.Forbidden, "Only a household owner can do this.");
        }

        var normalizedEmail = request.Email.Trim().ToUpperInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.NormalizedEmail == normalizedEmail, cancellationToken);
        if (user is null)
        {
            return Result<HouseholdResponse>.Failure(ErrorCodes.Validation, "No user with that email exists.");
        }

        var alreadyMember = await db.HouseholdMemberships
            .AnyAsync(m => m.HouseholdId == household.Id && m.UserId == user.Id, cancellationToken);
        if (alreadyMember)
        {
            return Result<HouseholdResponse>.Failure(ErrorCodes.Conflict, "That user is already a member.");
        }

        db.HouseholdMemberships.Add(new HouseholdMembership
        {
            HouseholdId = household.Id,
            UserId = user.Id,
            Role = request.Role,
        });
        await db.SaveChangesAsync(cancellationToken);

        return Result<HouseholdResponse>.Success(await ToResponseAsync(household, cancellationToken));
    }

    public async Task<Result<HouseholdResponse>> UpdateMemberRoleAsync(
        UpdateMemberRoleRequest request,
        CancellationToken cancellationToken)
    {
        var household = await FindAsync(request.Id, cancellationToken);
        if (household is null)
        {
            return Result<HouseholdResponse>.Failure(ErrorCodes.NotFound, "Household not found.");
        }

        if (!await IsOwnerAsync(household.Id, cancellationToken))
        {
            return Result<HouseholdResponse>.Failure(ErrorCodes.Forbidden, "Only a household owner can do this.");
        }

        var membership = await db.HouseholdMemberships
            .FirstOrDefaultAsync(m => m.HouseholdId == household.Id && m.UserId == request.UserId, cancellationToken);
        if (membership is null)
        {
            return Result<HouseholdResponse>.Failure(ErrorCodes.NotFound, "Membership not found.");
        }

        if (membership.Role == HouseholdRole.Owner
            && request.Role != HouseholdRole.Owner
            && !await HasAnotherOwnerAsync(household.Id, membership.UserId, cancellationToken))
        {
            return Result<HouseholdResponse>.Failure(
                ErrorCodes.Validation,
                "A household needs at least one owner.");
        }

        membership.Role = request.Role;
        await db.SaveChangesAsync(cancellationToken);

        return Result<HouseholdResponse>.Success(await ToResponseAsync(household, cancellationToken));
    }

    public async Task<Result<HouseholdResponse>> RemoveMemberAsync(
        Guid householdId,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var household = await FindAsync(householdId, cancellationToken);
        if (household is null)
        {
            return Result<HouseholdResponse>.Failure(ErrorCodes.NotFound, "Household not found.");
        }

        if (!await IsOwnerAsync(household.Id, cancellationToken))
        {
            return Result<HouseholdResponse>.Failure(ErrorCodes.Forbidden, "Only a household owner can do this.");
        }

        var membership = await db.HouseholdMemberships
            .FirstOrDefaultAsync(m => m.HouseholdId == household.Id && m.UserId == userId, cancellationToken);
        if (membership is null)
        {
            return Result<HouseholdResponse>.Failure(ErrorCodes.NotFound, "Membership not found.");
        }

        if (membership.Role == HouseholdRole.Owner
            && !await HasAnotherOwnerAsync(household.Id, membership.UserId, cancellationToken))
        {
            return Result<HouseholdResponse>.Failure(
                ErrorCodes.Validation,
                "A household needs at least one owner.");
        }

        db.HouseholdMemberships.Remove(membership);
        await db.SaveChangesAsync(cancellationToken);

        return Result<HouseholdResponse>.Success(await ToResponseAsync(household, cancellationToken));
    }

    private Task<Household?> FindAsync(Guid id, CancellationToken cancellationToken)
    {
        var householdId = new HouseholdId(id);
        return db.Households.FirstOrDefaultAsync(h => h.Id == householdId, cancellationToken);
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
            .Select(m => new HouseholdMemberResponse(
                m.UserId,
                users.TryGetValue(m.UserId, out var user) ? user.Email ?? "" : "",
                users.TryGetValue(m.UserId, out var user2) ? user2.DisplayName : "",
                m.Role))
            .ToList();

        var myRole = memberships.First(m => m.UserId == currentUser.Id).Role;

        return new HouseholdResponse(household.Id.Value, household.Name, myRole, members);
    }
}
