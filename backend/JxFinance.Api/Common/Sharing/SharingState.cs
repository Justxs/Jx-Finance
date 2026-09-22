using JxFinance.Domain.Common;
using JxFinance.Domain.Households;

namespace JxFinance.Common.Sharing;

public readonly record struct SharingState(Scope Scope, HouseholdId? HouseholdId)
{
    public static SharingState Of(IShareable entity) => new(entity.Scope, entity.HouseholdId);
}
