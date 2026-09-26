using JxFinance.Common;

namespace JxFinance.Endpoints.Transfers.GetTransfers;

public sealed class GetTransfersRequest : PagedRequest
{
    public DateOnly? Date { get; init; }
}
