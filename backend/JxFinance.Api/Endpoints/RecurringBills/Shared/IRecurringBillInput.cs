using JxFinance.Domain.RecurringBills;

namespace JxFinance.Endpoints.RecurringBills.Shared;

public interface IRecurringBillInput
{
    string Name { get; }
    RecurringBillShape Shape { get; }
    RecurringBillKind Kind { get; }
    decimal? Amount { get; }
    Guid? CategoryId { get; }
    Guid? AccountId { get; }
    Guid? ToAccountId { get; }
    RecurringBillCadence Cadence { get; }
    DateOnly NextDueDate { get; }
    int RemindDaysBefore { get; }
}
