using JxFinance.Domain.RecurringBills;

namespace JxFinance.Endpoints.RecurringBills.Shared;

public sealed record RecurringBillResponse(
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
