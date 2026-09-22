using JxFinance.Common.Amortization;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.NetWorth.CreateAsset;
using JxFinance.Endpoints.NetWorth.CreateDebt;
using JxFinance.Endpoints.NetWorth.Shared;
using JxFinance.Endpoints.NetWorth.UpdateAsset;
using JxFinance.Endpoints.NetWorth.UpdateDebt;

namespace JxFinance.Endpoints.NetWorth.Interfaces;

public interface INetWorthService
{
    Task<IReadOnlyList<AssetResponse>> GetAssetsAsync(CancellationToken cancellationToken);

    Task<Result<AssetResponse>> CreateAssetAsync(CreateAssetRequest request, CancellationToken cancellationToken);

    Task<Result<AssetResponse>> UpdateAssetAsync(UpdateAssetRequest request, CancellationToken cancellationToken);

    Task<Result<Guid>> DeleteAssetAsync(Guid id, CancellationToken cancellationToken);

    Task<IReadOnlyList<DebtResponse>> GetDebtsAsync(CancellationToken cancellationToken);

    Task<Result<DebtResponse>> CreateDebtAsync(CreateDebtRequest request, CancellationToken cancellationToken);

    Task<Result<DebtResponse>> UpdateDebtAsync(UpdateDebtRequest request, CancellationToken cancellationToken);

    Task<Result<Guid>> DeleteDebtAsync(Guid id, CancellationToken cancellationToken);

    Task<Result<DebtScheduleResponse>> GetDebtScheduleAsync(Guid id, ExtraPayments extra, CancellationToken cancellationToken);

    Task<NetWorthResponse> GetCurrentAsync(CancellationToken cancellationToken);

    Task<NetWorthHistoryResponse> GetHistoryAsync(CancellationToken cancellationToken);
}
