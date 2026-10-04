using JxFinance.Domain.Common;
using JxFinance.Endpoints.RecurringBills.GetBillsCalendar;
using JxFinance.Endpoints.RecurringBills.GetRecurringTotals;

namespace JxFinance.Endpoints.RecurringBills.Interfaces;

public interface IRecurringBillScheduleService
{
    Task<Result<BillsCalendarResponse>> GetCalendarAsync(string? month, CancellationToken cancellationToken);

    Task<RecurringTotalsResponse> GetTotalsAsync(CancellationToken cancellationToken);
}
