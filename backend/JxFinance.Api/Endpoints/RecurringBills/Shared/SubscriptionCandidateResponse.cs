using JxFinance.Common.Json;
using JxFinance.Domain.RecurringBills;

namespace JxFinance.Endpoints.RecurringBills.Shared;

public sealed record SubscriptionCandidateResponse(
    string Description,
    Guid AccountId,
    Guid? CategoryId,
    RecurringBillCadence Cadence,
    [property: Money] decimal TypicalAmount,
    IReadOnlyList<DateOnly> OccurrenceDates,
    DateOnly NextExpectedDate);
