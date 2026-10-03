using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.Interfaces;

public interface INetWorthService
{
    Task<NetWorthResponse> GetCurrentAsync(CancellationToken cancellationToken);

    Task<NetWorthResponse> CountOpenBalancesAsync(bool count, CancellationToken cancellationToken);

    Task<NetWorthHistoryResponse> GetHistoryAsync(CancellationToken cancellationToken);
}
