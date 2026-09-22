using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Transfers.Interfaces;
using JxFinance.Endpoints.Transfers.Shared;

namespace JxFinance.Endpoints.Transfers.CreateTransfer;

public sealed class CreateTransferEndpoint(ITransferService transferService)
    : Endpoint<CreateTransferRequest, TransferResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Transfers);
        Group<TransfersGroup>();
        Description(d => d.ProducesCreated<TransferResponse>());
    }

    public override async Task HandleAsync(CreateTransferRequest req, CancellationToken ct)
    {
        await Send.CreatedOrProblemAsync(await transferService.CreateAsync(req, ct), transfer => $"{ApiRoutes.TransfersPath}/{transfer.Id}", ct);
    }
}
