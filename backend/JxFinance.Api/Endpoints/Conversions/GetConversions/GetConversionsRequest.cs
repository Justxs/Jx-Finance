using JxFinance.Common;

namespace JxFinance.Endpoints.Conversions.GetConversions;

public sealed class GetConversionsRequest : PagedRequest
{
    public Guid? AccountId { get; init; }
}
