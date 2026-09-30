using JxFinance.Common.Json;
using JxFinance.Domain.Common;
using JxFinance.Domain.RecurringBills;

namespace JxFinance.Endpoints.RecurringBills.GetBillsCalendar;

public sealed record BillOccurrence(
    DateOnly Date,
    Guid BillId,
    string Name,
    RecurringBillShape Shape,
    [property: Money] decimal? Amount,
    Currency? Currency,
    bool Estimated,
    BillOccurrenceStatus Status,
    bool IsNextDue,
    bool Unconfirmed,
    bool AccountNotVisible,
    Guid? AccountId,
    Guid? TransactionId);
