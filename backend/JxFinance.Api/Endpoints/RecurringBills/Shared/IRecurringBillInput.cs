using JxFinance.Common.Sharing;
using JxFinance.Domain.RecurringBills;

namespace JxFinance.Endpoints.RecurringBills.Shared;

public interface IRecurringBillInput : IShareableInput
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
    string? MatchKey { get; }
    Guid? DebtId { get; }
    int? SpreadMonths { get; }
}
