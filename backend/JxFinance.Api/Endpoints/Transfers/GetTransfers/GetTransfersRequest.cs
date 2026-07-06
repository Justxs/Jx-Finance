namespace JxFinance.Endpoints.Transfers.GetTransfers;

public sealed class GetTransfersRequest
{
    public int Page { get; init; } = 1;

    public int PageSize { get; init; } = 20;
}
