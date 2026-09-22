using System.Net.Mime;
using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
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
        Description(d => d.ClearDefaultProduces(200).Produces<TransferResponse>(201, MediaTypeNames.Application.Json));
    }

    public override async Task HandleAsync(CreateTransferRequest req, CancellationToken ct)
    {
        var transfer = (await transferService.CreateAsync(req, ct)).ValueOrThrow();
        await Send.ResultAsync(TypedResults.Created($"{ApiRoutes.TransfersPath}/{transfer.Id}", transfer));
    }
}
