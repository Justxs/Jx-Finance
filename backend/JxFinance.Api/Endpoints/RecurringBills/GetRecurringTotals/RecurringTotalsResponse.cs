using JxFinance.Common.Json;

namespace JxFinance.Endpoints.RecurringBills.GetRecurringTotals;

public sealed record RecurringTotalsResponse(
    [property: Money] decimal MonthlyOut,
    [property: Money] decimal YearlyOut,
    [property: Money] decimal MonthlyIn,
    [property: Money] decimal YearlyIn,
    bool Partial,
    int Unpriced,
    IReadOnlyList<Guid> PossiblyCancelled);
