using JxFinance.Domain.Common;
using JxFinance.Endpoints.Investments.SaveBrokerConnection;
using JxFinance.Endpoints.Investments.Shared;

namespace JxFinance.Endpoints.Investments.Interfaces;

public interface IBrokerImportService
{
    Task<Result<BrokerImportResponse>> ImportAsync(
        Guid accountId,
        Guid? fundingAccountId,
        Stream report,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<BrokerConnectionResponse>> GetConnectionsAsync(CancellationToken cancellationToken);

    Task<Result<BrokerConnectionResponse>> SaveConnectionAsync(
        SaveBrokerConnectionRequest request,
        CancellationToken cancellationToken);

    Task<Result<Guid>> DeleteConnectionAsync(Guid accountId, CancellationToken cancellationToken);

    Task<Result<BrokerImportResponse>> SyncAsync(Guid accountId, CancellationToken cancellationToken);
}
