using JxFinance.Common.Amortization;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.NetWorth.CreateDebt;
using JxFinance.Endpoints.NetWorth.DeleteDebtBalance;
using JxFinance.Endpoints.NetWorth.GetDebtPaymentCandidates;
using JxFinance.Endpoints.NetWorth.LinkDebtPayment;
using JxFinance.Endpoints.NetWorth.SetDebtBalance;
using JxFinance.Endpoints.NetWorth.Shared;
using JxFinance.Endpoints.NetWorth.UnlinkDebtPayment;
using JxFinance.Endpoints.NetWorth.UpdateDebt;
using JxFinance.Endpoints.NetWorth.UpdateDebtPayment;
using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.NetWorth.Interfaces;

public interface IDebtService
{
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
}
