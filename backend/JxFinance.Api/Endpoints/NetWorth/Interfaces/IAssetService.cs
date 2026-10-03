using JxFinance.Domain.Common;
using JxFinance.Endpoints.NetWorth.CreateAsset;
using JxFinance.Endpoints.NetWorth.DeleteAssetValuation;
using JxFinance.Endpoints.NetWorth.GetAssetValueHistory;
using JxFinance.Endpoints.NetWorth.SetAssetValuation;
using JxFinance.Endpoints.NetWorth.Shared;
using JxFinance.Endpoints.NetWorth.UpdateAsset;

namespace JxFinance.Endpoints.NetWorth.Interfaces;

public interface IAssetService
{
    Task<IReadOnlyList<AssetResponse>> GetAssetsAsync(CancellationToken cancellationToken);

    Task<Result<AssetResponse>> CreateAssetAsync(CreateAssetRequest request, CancellationToken cancellationToken);

    Task<Result<AssetResponse>> UpdateAssetAsync(UpdateAssetRequest request, CancellationToken cancellationToken);

    Task<Result<Guid>> DeleteAssetAsync(Guid id, CancellationToken cancellationToken);

    Task<Result<IReadOnlyList<AssetValuationResponse>>> GetValuationsAsync(Guid id, CancellationToken cancellationToken);

    Task<Result<AssetResponse>> SetValuationAsync(SetAssetValuationRequest request, CancellationToken cancellationToken);

    Task<Result> DeleteValuationAsync(DeleteAssetValuationRequest request, CancellationToken cancellationToken);

    Task<Result<AssetValueHistoryResponse>> GetValueHistoryAsync(GetAssetValueHistoryRequest request, CancellationToken cancellationToken);
}
