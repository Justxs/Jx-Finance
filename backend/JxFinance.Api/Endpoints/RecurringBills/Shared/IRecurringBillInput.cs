using JxFinance.Domain.RecurringBills;

namespace JxFinance.Endpoints.RecurringBills.Shared;

public interface IRecurringBillInput
{
    string Name { get; }
    RecurringBillKind Kind { get; }
    decimal? Amount { get; }
    Guid? CategoryId { get; }
    Guid? AccountId { get; }
    RecurringBillCadence Cadence { get; }
    DateOnly NextDueDate { get; }
    int RemindDaysBefore { get; }
}
