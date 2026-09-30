using JxFinance.Common.Json;

namespace JxFinance.Endpoints.RecurringBills.GetBillsCalendar;

public sealed record BillsCalendarResponse(
    DateOnly From,
    DateOnly To,
    [property: Money] decimal ExpectedOut,
    [property: Money] decimal ExpectedIn,
    [property: Money] decimal PaidOut,
    bool Partial,
    int Unpriced,
    IReadOnlyList<BillOccurrence> Occurrences);
