namespace JxFinance.Endpoints.Accounts.GetCashFlowForecast;

public sealed record CashFlowForecastResponse(
    DateOnly From,
    DateOnly To,
    IReadOnlyList<AccountForecastResponse> Accounts,
    IReadOnlyList<ForecastSkippedEntry> NotCounted);
