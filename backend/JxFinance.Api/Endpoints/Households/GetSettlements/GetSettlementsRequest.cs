using JxFinance.Common;

namespace JxFinance.Endpoints.Households.GetSettlements;

public sealed class GetSettlementsRequest : PagedRequest
{
    public Guid Id { get; init; }
}
