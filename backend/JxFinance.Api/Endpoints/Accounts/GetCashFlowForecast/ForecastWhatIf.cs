namespace JxFinance.Endpoints.Accounts.GetCashFlowForecast;

public sealed record ForecastWhatIf(Guid AccountId, decimal Amount, DateOnly Date);
