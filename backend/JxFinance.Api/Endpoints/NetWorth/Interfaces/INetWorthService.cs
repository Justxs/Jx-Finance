using JxFinance.Common.Amortization;
using JxFinance.Domain.Common;
using JxFinance.Domain.NetWorth;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.Interfaces;

public interface INetWorthService
{
    Task<IReadOnlyList<Asset>> GetAssetsAsync(CancellationToken cancellationToken);

    Task<Asset> CreateAssetAsync(Asset asset, CancellationToken cancellationToken);

    Task<Result<Asset>> UpdateAssetAsync(Guid id, Action<Asset> apply, CancellationToken cancellationToken);

    Task<Result<Guid>> DeleteAssetAsync(Guid id, CancellationToken cancellationToken);

    Task<IReadOnlyList<Debt>> GetDebtsAsync(CancellationToken cancellationToken);

    Task<Debt> CreateDebtAsync(Debt debt, CancellationToken cancellationToken);

    Task<Result<Debt>> UpdateDebtAsync(Guid id, Action<Debt> apply, CancellationToken cancellationToken);

    Task<Result<Guid>> DeleteDebtAsync(Guid id, CancellationToken cancellationToken);

    Task<Result<DebtScheduleResponse>> GetDebtScheduleAsync(Guid id, ExtraPayments extra, CancellationToken cancellationToken);

    Task<NetWorthResponse> GetCurrentAsync(CancellationToken cancellationToken);

    Task<NetWorthHistoryResponse> GetHistoryAsync(CancellationToken cancellationToken);
}
