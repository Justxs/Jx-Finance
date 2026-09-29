using JxFinance.Common.Json;
using JxFinance.Domain.RecurringBills;

namespace JxFinance.Endpoints.Accounts.GetCashFlowForecast;

public sealed record ForecastEntryResponse(
    DateOnly Date,
    ForecastEntrySource Source,
    Guid? BillId,
    string? Name,
    RecurringBillShape? Shape,
    [property: Money] decimal Amount,
    bool Estimated,
    bool Overdue,
    [property: Money] decimal BalanceAfter);
