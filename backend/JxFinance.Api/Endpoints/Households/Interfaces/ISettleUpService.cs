using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Households.CreateSettlement;
using JxFinance.Endpoints.Households.CreateSharedExpense;
using JxFinance.Endpoints.Households.GetSettlements;
using JxFinance.Endpoints.Households.GetSharedExpenses;
using JxFinance.Endpoints.Households.Shared;
using JxFinance.Endpoints.Households.UpdateSharedExpense;

namespace JxFinance.Endpoints.Households.Interfaces;

public interface ISettleUpService
{
    Task<Result<SettleUpResponse>> GetBalancesAsync(Guid householdId, CancellationToken cancellationToken);

    Task<Result<PagedResponse<SharedExpenseResponse>>> GetSharedExpensesAsync(
        GetSharedExpensesRequest request,
        CancellationToken cancellationToken);

    Task<Result<SharedExpenseResponse>> CreateSharedExpenseAsync(
        CreateSharedExpenseRequest request,
        CancellationToken cancellationToken);

    Task<Result<SharedExpenseResponse>> UpdateSharedExpenseAsync(
        UpdateSharedExpenseRequest request,
        CancellationToken cancellationToken);

    Task<Result<Guid>> DeleteSharedExpenseAsync(Guid householdId, Guid expenseId, CancellationToken cancellationToken);

    Task<Result<PagedResponse<HouseholdSettlementResponse>>> GetSettlementsAsync(
        GetSettlementsRequest request,
        CancellationToken cancellationToken);

    Task<Result<HouseholdSettlementResponse>> CreateSettlementAsync(
        CreateSettlementRequest request,
        CancellationToken cancellationToken);

    Task<Result<Guid>> DeleteSettlementAsync(Guid householdId, Guid settlementId, CancellationToken cancellationToken);
}
