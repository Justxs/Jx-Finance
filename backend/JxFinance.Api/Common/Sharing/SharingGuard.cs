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

    public Task<DomainError?> CheckReferencesAsync(
        IShareableInput input,
        SharedReferences references,
        CancellationToken cancellationToken) =>
        CheckReferencesAsync(SharingState.From(input), references, cancellationToken);

    public async Task<DomainError?> CheckReferencesAsync(
        SharingState state,
        SharedReferences references,
        CancellationToken cancellationToken)
    {
        if (state.HouseholdId is not { } householdId)
        {
            return null;
        }

        var accounts = references.Accounts.Distinct().ToList();
        var categories = references.Categories.Distinct().ToList();
        var tags = references.Tags.Distinct().ToList();
        var debts = (references.Debts ?? []).Distinct().ToList();
        var shared = await db.Accounts.CountAsync(a => accounts.Contains(a.Id) && a.Scope == Scope.Shared && a.HouseholdId == householdId, cancellationToken) == accounts.Count
            && await db.Categories.CountAsync(c => categories.Contains(c.Id) && c.Scope == Scope.Shared && c.HouseholdId == householdId, cancellationToken) == categories.Count
            && await db.Tags.CountAsync(t => tags.Contains(t.Id) && t.Scope == Scope.Shared && t.HouseholdId == householdId, cancellationToken) == tags.Count
            && await db.Debts.CountAsync(d => debts.Contains(d.Id) && d.Scope == Scope.Shared && d.HouseholdId == householdId, cancellationToken) == debts.Count;

        return shared
            ? null
            : new DomainError(
                ErrorCodes.HouseholdReferenceNotShared,
                "Everything a shared item points at must be shared with the same household.");
    }

    private async Task<DomainError?> CheckAsync(
        SharingState next,
        (Guid OwnerId, SharingState State)? current,
        CancellationToken cancellationToken)
    {
        if (next.Scope == Scope.Shared && next.HouseholdId is { } householdId)
        {
            var isMember = await db.HouseholdMemberships.AnyAsync(
                m => m.HouseholdId == householdId
                    && m.UserId == currentUser.Id
                    && db.Households.Any(h => h.Id == householdId),
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
