using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Transfers.Interfaces;

namespace JxFinance.Endpoints.Transfers.DeleteTransfer;

public sealed class DeleteTransferEndpoint(ITransferService transferService) : DeleteEndpoint
{
    public override void Configure()
    {
        Delete(ApiRoutes.Transfers + "/{id}");
        Group<TransfersGroup>();
        Metadata(TokenWritable.Yes);
        Description(d => d.ProducesProblemDetails(404));
    }

    protected override Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken ct) =>
        transferService.DeleteAsync(id, ct);
}
