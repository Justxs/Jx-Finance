using FastEndpoints;
using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.Transfers.DeleteTransfer;

public sealed class DeleteTransferEndpoint(ITransferService transferService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Delete("/api/transfers/{id}");
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var result = await transferService.DeleteAsync(Route<Guid>("id"), ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.NoContentAsync(ct);
    }
}
