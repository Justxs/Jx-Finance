using JxFinance.Common;

namespace JxFinance.Infrastructure.Auth;

public static class ActiveHousehold
{
    public const string HeaderName = "X-Active-Household";

    public const string QueryName = "activeHousehold";

    public const string ItemKey = "jx.activeHousehold";

    public static bool TakesQueryScope(Endpoint? endpoint) =>
        endpoint?.Metadata.GetMetadata<QueryHouseholdScope>() is not null;
}
