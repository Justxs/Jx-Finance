using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Transfers.Interfaces;
using JxFinance.Endpoints.Transfers.Shared;

namespace JxFinance.Endpoints.Transfers.GetTransfers;

public sealed class GetTransfersEndpoint(ITransferService transferService)
    : Endpoint<GetTransfersRequest, PagedResponse<TransferResponse>>
{
    public override void Configure()
    {
        Get("transfers");
        Group<TransfersGroup>();
    }

    public override async Task HandleAsync(GetTransfersRequest req, CancellationToken ct)
    {
        var page = await transferService.GetPageAsync(req, ct);
        await Send.OkAsync(page, ct);
    }
}
