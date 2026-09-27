using JxFinance.Common.Json;

namespace JxFinance.Endpoints.RecurringBills.Shared;

public sealed record RecurringBillMatchResponse(
    DateOnly Date,
    [property: Money] decimal Amount,
    [property: Money] decimal? Expected,
    bool IsPriceRise);
