using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Transfers.Interfaces;
using JxFinance.Endpoints.Transfers.Shared;

namespace JxFinance.Endpoints.Transfers.CreateTransfer;

public sealed class CreateTransferEndpoint(ITransferService transferService)
    : Endpoint<CreateTransferRequest, TransferResponse>
{
    public override void Configure()
    {
        Post("transfers");
        Group<TransfersGroup>();
        Description(d => d.ClearDefaultProduces(200).Produces<TransferResponse>(201, "application/json"));
    }

    public override async Task HandleAsync(CreateTransferRequest req, CancellationToken ct)
    {
        var transfer = (await transferService.CreateAsync(req, ct)).ValueOrThrow();
        await Send.ResultAsync(TypedResults.Created($"/api/transfers/{transfer.Id}", transfer));
    }
}
