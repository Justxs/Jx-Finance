using JxFinance.Common.Json;
using JxFinance.Domain.RecurringBills;
using JxFinance.Endpoints.RecurringBills.Shared;

namespace JxFinance.Endpoints.RecurringBills.CreateRecurringBill;

public sealed record CreateRecurringBillRequest(
    string Name,
    RecurringBillShape Shape,
    RecurringBillKind Kind,
    [property: Money] decimal? Amount,
    Guid? CategoryId,
    Guid? AccountId,
    Guid? ToAccountId,
    RecurringBillCadence Cadence,
    DateOnly NextDueDate,
    int RemindDaysBefore) : IRecurringBillInput;
