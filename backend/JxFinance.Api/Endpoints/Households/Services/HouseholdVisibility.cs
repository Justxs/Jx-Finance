using JxFinance.Domain.Common;
using JxFinance.Domain.Households;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Households.Services;

public static class HouseholdVisibility
{
    public static async Task<bool> IsVisibleAsync(
        AppDbContext db,
        ICurrentUser currentUser,
        HouseholdId householdId,
        CancellationToken cancellationToken) =>
        (currentUser.ActiveHouseholdId is not { } active || active == householdId)
        && await db.Households.AnyAsync(h => h.Id == householdId, cancellationToken);
}
