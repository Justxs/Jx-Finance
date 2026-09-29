namespace JxFinance.Endpoints.Accounts.GetCashFlowForecast;

public sealed record ForecastSkippedEntry(Guid BillId, string Name, ForecastSkipReason Reason);
