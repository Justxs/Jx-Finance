using JxFinance.Domain.Common;
using JxFinance.Endpoints.Investments.Shared;
using JxFinance.Infrastructure.MarketPrices;

namespace JxFinance.Endpoints.Investments.Interfaces;

public interface IPriceSyncService
{
    Task<Result<MarketPriceSyncResponse>> SyncAsync(bool force, CancellationToken cancellationToken);

    Task<Result<IReadOnlyList<PriceSymbolCandidate>>> FindSymbolAsync(Guid securityId, CancellationToken cancellationToken);
}
