using JxFinance.Domain.Common;

namespace JxFinance.Common.Sharing;

public static class ShareableInputExtensions
{
    public static void ApplySharing(this IShareable entity, IShareableInput input)
    {
        var state = SharingState.From(input);
        entity.Scope = state.Scope;
        entity.HouseholdId = state.HouseholdId;
    }
}
