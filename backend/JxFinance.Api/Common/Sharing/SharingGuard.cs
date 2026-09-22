using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Common.Sharing;

[RegisterService<ISharingGuard>(LifeTime.Scoped)]
public sealed class SharingGuard(AppDbContext db, ICurrentUser currentUser) : ISharingGuard
{
    public async Task<DomainError?> CheckAsync<T>(T entity, SharingState? previous, CancellationToken cancellationToken)
        where T : OwnableEntity, IShareable
    {
        if (entity.Scope == Scope.Shared && entity.HouseholdId is { } householdId)
        {
            var isMember = await db.HouseholdMemberships.AnyAsync(
                m => m.HouseholdId == householdId && m.UserId == currentUser.Id,
                cancellationToken);
            if (!isMember)
            {
                return new DomainError(ErrorCodes.HouseholdNotMember, "You are not a member of that household.");
            }
        }

        if (previous is { } before && entity.UserId != currentUser.Id && SharingState.Of(entity) != before)
        {
            return new DomainError(ErrorCodes.AccessForbidden, "Only the owner can change sharing.");
        }

        return null;
    }
}
