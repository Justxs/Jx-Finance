using JxFinance.Common;

namespace JxFinance.Endpoints.Trash.GetTrash;

public sealed class GetTrashRequest : IPagedRequest
{
    public int Page { get; init; } = 1;

    public int PageSize { get; init; } = 20;
}
