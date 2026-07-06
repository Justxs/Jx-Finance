using JxFinance.Domain.RecurringBills;

namespace JxFinance.Endpoints.RecurringBills.UpdateRecurringBill;

public sealed record UpdateRecurringBillRequest(
    Guid Id,
    string Name,
    RecurringBillKind Kind,
    string? Amount,
    Guid? CategoryId,
    Guid? AccountId,
    RecurringBillCadence Cadence,
    DateOnly NextDueDate,
    int RemindDaysBefore,
    bool IsActive);
