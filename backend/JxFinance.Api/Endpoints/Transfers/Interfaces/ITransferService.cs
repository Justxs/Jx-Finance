using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Transfers.CreateTransfer;
using JxFinance.Endpoints.Transfers.GetTransfers;
using JxFinance.Endpoints.Transfers.Shared;

namespace JxFinance.Endpoints.Transfers.Interfaces;

public interface ITransferService
{
    Task<PagedResponse<TransferResponse>> GetPageAsync(
        GetTransfersRequest request,
        CancellationToken cancellationToken);

    Task<Result<TransferResponse>> CreateAsync(
        CreateTransferRequest request,
        CancellationToken cancellationToken);

    Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken);
}
