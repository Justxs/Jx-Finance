using JxFinance.Common;

namespace JxFinance.Endpoints.Conversions.GetConversions;

public sealed class GetConversionsRequest : IPagedRequest
{
    public int Page { get; init; } = 1;

    public int PageSize { get; init; } = 20;

    public Guid? AccountId { get; init; }
}
