using JxFinance.Domain.RecurringBills;

namespace JxFinance.Endpoints.RecurringBills.CreateRecurringBill;

public sealed record CreateRecurringBillRequest(
    string Name,
    RecurringBillKind Kind,
    string? Amount,
    Guid? CategoryId,
    Guid? AccountId,
    RecurringBillCadence Cadence,
    DateOnly NextDueDate,
    int RemindDaysBefore);
