using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Transfers.Interfaces;

namespace JxFinance.Endpoints.Transfers.DeleteTransfer;

public sealed class DeleteTransferEndpoint(ITransferService transferService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Delete("transfers/{id}");
        Group<TransfersGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        (await transferService.DeleteAsync(Route<Guid>("id"), ct)).EnsureSuccess();
        await Send.NoContentAsync(ct);
    }
}
