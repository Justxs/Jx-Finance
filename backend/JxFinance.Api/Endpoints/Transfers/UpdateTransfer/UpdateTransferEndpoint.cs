using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Transfers.Interfaces;
using JxFinance.Endpoints.Transfers.Shared;

namespace JxFinance.Endpoints.Transfers.UpdateTransfer;

public sealed class UpdateTransferEndpoint(ITransferService transferService)
    : Endpoint<UpdateTransferRequest, TransferResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Transfers + "/{id}");
        Group<TransfersGroup>();
        Description(d => d.ProducesProblemDetails(403).ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateTransferRequest req, CancellationToken ct)
    {
        var transfer = (await transferService.UpdateAsync(req, ct)).ValueOrThrow();
        await Send.OkAsync(transfer, ct);
    }
}
