using JxFinance.Domain.Common;
using JxFinance.Domain.RecurringBills;
using JxFinance.Endpoints.RecurringBills.ConfirmRecurringBill;
using JxFinance.Endpoints.RecurringBills.Shared;

namespace JxFinance.Endpoints.RecurringBills.Interfaces;

public interface IRecurringBillService
{
    Task<IReadOnlyList<RecurringBill>> GetAllAsync(CancellationToken cancellationToken);

    Task<Result<RecurringBill>> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    Task<Result<RecurringBill>> CreateAsync(RecurringBill bill, CancellationToken cancellationToken);

    Task<Result<RecurringBill>> UpdateAsync(Guid id, Action<RecurringBill> apply, CancellationToken cancellationToken);

    Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken);

    Task<Result<RecurringBillConfirmation>> ConfirmAsync(
        ConfirmRecurringBillRequest request,
        CancellationToken cancellationToken);
}
