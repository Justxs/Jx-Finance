using JxFinance.Common.Json;
using JxFinance.Domain.RecurringBills;
using JxFinance.Endpoints.RecurringBills.Shared;

namespace JxFinance.Endpoints.RecurringBills.UpdateRecurringBill;

public sealed record UpdateRecurringBillRequest(
    Guid Id,
    string Name,
    RecurringBillKind Kind,
    [property: Money] decimal? Amount,
    Guid? CategoryId,
    Guid? AccountId,
    RecurringBillCadence Cadence,
    DateOnly NextDueDate,
    int RemindDaysBefore,
    bool IsActive) : IRecurringBillInput;
