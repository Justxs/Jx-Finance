using JxFinance.Common.Json;
using JxFinance.Domain.RecurringBills;

namespace JxFinance.Endpoints.RecurringBills.Shared;

public sealed record RecurringBillResponse(
    Guid Id,
    string Name,
    RecurringBillShape Shape,
    RecurringBillKind Kind,
    [property: Money] decimal? Amount,
    Guid? CategoryId,
    Guid? AccountId,
    Guid? ToAccountId,
    RecurringBillCadence Cadence,
    DateOnly NextDueDate,
    int RemindDaysBefore,
    bool IsActive);
