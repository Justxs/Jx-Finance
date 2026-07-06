using JxFinance.Domain.Common;
using JxFinance.Endpoints.RecurringBills.ConfirmRecurringBill;
using JxFinance.Endpoints.RecurringBills.CreateRecurringBill;
using JxFinance.Endpoints.RecurringBills.UpdateRecurringBill;

namespace JxFinance.Endpoints.RecurringBills;

public interface IRecurringBillService
{
    Task<IReadOnlyList<RecurringBillResponse>> GetAllAsync(CancellationToken cancellationToken);

    Task<Result<RecurringBillResponse>> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    Task<RecurringBillResponse> CreateAsync(CreateRecurringBillRequest request, CancellationToken cancellationToken);

    Task<Result<RecurringBillResponse>> UpdateAsync(
        UpdateRecurringBillRequest request,
        CancellationToken cancellationToken);

    Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken);

    Task<Result<ConfirmRecurringBillResponse>> ConfirmAsync(
        ConfirmRecurringBillRequest request,
        CancellationToken cancellationToken);
}
