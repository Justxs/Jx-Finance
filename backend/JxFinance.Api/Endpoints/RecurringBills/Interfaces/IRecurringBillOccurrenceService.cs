using JxFinance.Domain.Common;
using JxFinance.Endpoints.RecurringBills.ConfirmRecurringBill;
using JxFinance.Endpoints.RecurringBills.Shared;
using JxFinance.Endpoints.RecurringBills.SkipRecurringBill;

namespace JxFinance.Endpoints.RecurringBills.Interfaces;

public interface IRecurringBillOccurrenceService
{
    Task<Result<ConfirmRecurringBillResponse>> ConfirmAsync(
        ConfirmRecurringBillRequest request,
        CancellationToken cancellationToken);

    Task<Result<RecurringBillResponse>> SkipAsync(
        SkipRecurringBillRequest request,
        CancellationToken cancellationToken);
}
