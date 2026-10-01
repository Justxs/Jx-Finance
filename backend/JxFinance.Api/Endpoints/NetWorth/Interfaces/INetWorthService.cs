using JxFinance.Common.Amortization;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.NetWorth.CreateAsset;
using JxFinance.Endpoints.NetWorth.CreateDebt;
using JxFinance.Endpoints.NetWorth.DeleteAssetValuation;
using JxFinance.Endpoints.NetWorth.DeleteDebtBalance;
using JxFinance.Endpoints.NetWorth.GetAssetValueHistory;
using JxFinance.Endpoints.NetWorth.GetDebtPaymentCandidates;
using JxFinance.Endpoints.NetWorth.LinkDebtPayment;
using JxFinance.Endpoints.NetWorth.SetAssetValuation;
using JxFinance.Endpoints.NetWorth.SetDebtBalance;
using JxFinance.Endpoints.NetWorth.Shared;
using JxFinance.Endpoints.NetWorth.UnlinkDebtPayment;
using JxFinance.Endpoints.NetWorth.UpdateAsset;
using JxFinance.Endpoints.NetWorth.UpdateDebt;
using JxFinance.Endpoints.NetWorth.UpdateDebtPayment;
using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.NetWorth.Interfaces;

public interface INetWorthService
{
    Task<IReadOnlyList<AssetResponse>> GetAssetsAsync(CancellationToken cancellationToken);

    Task<Result<AssetResponse>> CreateAssetAsync(CreateAssetRequest request, CancellationToken cancellationToken);

    Task<Result<AssetResponse>> UpdateAssetAsync(UpdateAssetRequest request, CancellationToken cancellationToken);

    Task<Result<Guid>> DeleteAssetAsync(Guid id, CancellationToken cancellationToken);

    Task<Result<IReadOnlyList<AssetValuationResponse>>> GetValuationsAsync(Guid id, CancellationToken cancellationToken);

    Task<Result<AssetResponse>> SetValuationAsync(SetAssetValuationRequest request, CancellationToken cancellationToken);

    Task<Result> DeleteValuationAsync(DeleteAssetValuationRequest request, CancellationToken cancellationToken);

    Task<Result<AssetValueHistoryResponse>> GetValueHistoryAsync(GetAssetValueHistoryRequest request, CancellationToken cancellationToken);

    Task<IReadOnlyList<DebtResponse>> GetDebtsAsync(CancellationToken cancellationToken);

    Task<Result<DebtResponse>> CreateDebtAsync(CreateDebtRequest request, CancellationToken cancellationToken);

    Task<Result<DebtResponse>> UpdateDebtAsync(UpdateDebtRequest request, CancellationToken cancellationToken);

    Task<Result<Guid>> DeleteDebtAsync(Guid id, CancellationToken cancellationToken);

    Task<Result<IReadOnlyList<DebtBalanceEntryResponse>>> GetDebtBalancesAsync(Guid id, CancellationToken cancellationToken);

    Task<Result<DebtResponse>> SetDebtBalanceAsync(SetDebtBalanceRequest request, CancellationToken cancellationToken);

    Task<Result> DeleteDebtBalanceAsync(DeleteDebtBalanceRequest request, CancellationToken cancellationToken);

    Task<Result<DebtScheduleResponse>> GetDebtScheduleAsync(Guid id, ExtraPayments extra, CancellationToken cancellationToken);

    Task<Result<IReadOnlyList<DebtPaymentResponse>>> GetDebtPaymentsAsync(Guid id, CancellationToken cancellationToken);

    Task<Result<DebtResponse>> LinkDebtPaymentAsync(LinkDebtPaymentRequest request, CancellationToken cancellationToken);

    Task<Result<DebtResponse>> UpdateDebtPaymentAsync(UpdateDebtPaymentRequest request, CancellationToken cancellationToken);

    Task<Result> UnlinkDebtPaymentAsync(UnlinkDebtPaymentRequest request, CancellationToken cancellationToken);

    Task<Result<IReadOnlyList<TransactionResponse>>> GetDebtPaymentCandidatesAsync(
        GetDebtPaymentCandidatesRequest request,
        CancellationToken cancellationToken);

    Task<NetWorthResponse> GetCurrentAsync(CancellationToken cancellationToken);

    Task<NetWorthHistoryResponse> GetHistoryAsync(CancellationToken cancellationToken);
}
