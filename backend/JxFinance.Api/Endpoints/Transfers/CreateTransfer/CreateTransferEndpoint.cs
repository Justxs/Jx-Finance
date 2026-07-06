using FastEndpoints;
using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.Transfers.CreateTransfer;

public sealed class CreateTransferEndpoint(ITransferService transferService)
    : Endpoint<CreateTransferRequest, TransferResponse>
{
    public override void Configure()
    {
        Post("/api/transfers");
    }

    public override async Task HandleAsync(CreateTransferRequest req, CancellationToken ct)
    {
        var result = await transferService.CreateAsync(req, ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.ResultAsync(Results.Created($"/api/transfers/{result.Value!.Id}", result.Value));
    }
}
