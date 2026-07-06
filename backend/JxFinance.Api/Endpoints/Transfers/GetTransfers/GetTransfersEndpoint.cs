using FastEndpoints;
using JxFinance.Common;

namespace JxFinance.Endpoints.Transfers.GetTransfers;

public sealed class GetTransfersEndpoint(ITransferService transferService)
    : Endpoint<GetTransfersRequest, PagedResponse<TransferResponse>>
{
    public override void Configure()
    {
        Get("/api/transfers");
    }

    public override async Task HandleAsync(GetTransfersRequest req, CancellationToken ct)
    {
        var page = await transferService.GetPageAsync(req, ct);
        await Send.OkAsync(page, ct);
    }
}
