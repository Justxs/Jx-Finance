using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Common.Sharing;

[RegisterService<ISharingGuard>(LifeTime.Scoped)]
public sealed class SharingGuard(AppDbContext db, ICurrentUser currentUser) : ISharingGuard
{
    public Task<DomainError?> CheckAsync(IShareableInput input, CancellationToken cancellationToken) =>
        CheckAsync(SharingState.From(input), null, cancellationToken);

    public Task<DomainError?> CheckAsync<T>(T existing, IShareableInput input, CancellationToken cancellationToken)
        where T : OwnableEntity, IShareable =>
        CheckAsync(SharingState.From(input), (existing.UserId, SharingState.Of(existing)), cancellationToken);

    private async Task<DomainError?> CheckAsync(
        SharingState next,
        (Guid OwnerId, SharingState State)? current,
        CancellationToken cancellationToken)
    {
        if (next.Scope == Scope.Shared && next.HouseholdId is { } householdId)
        {
            var isMember = await db.HouseholdMemberships.AnyAsync(
                m => m.HouseholdId == householdId && m.UserId == currentUser.Id,
                cancellationToken);
            if (!isMember)
            {
                return new DomainError(ErrorCodes.HouseholdNotMember, "You are not a member of that household.");
            }
        }

        if (current is { } before && before.OwnerId != currentUser.Id && next != before.State)
        {
            return new DomainError(ErrorCodes.AccessForbidden, "Only the owner can change sharing.");
        }

        return null;
    }
}
