using JxFinance.Domain.Common;
using JxFinance.Domain.Households;

namespace JxFinance.Common.Sharing;

public static class ShareableInputExtensions
{
    public static void ApplySharing(this IShareable entity, IShareableInput input)
    {
        entity.Scope = input.Scope;
        entity.HouseholdId = input.Scope == Scope.Shared ? new HouseholdId(input.HouseholdId!.Value) : null;
    }
}
