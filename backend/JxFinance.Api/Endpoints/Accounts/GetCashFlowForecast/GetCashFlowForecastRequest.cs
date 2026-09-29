namespace JxFinance.Endpoints.Accounts.GetCashFlowForecast;

public sealed class GetCashFlowForecastRequest
{
    public int Days { get; init; } = 90;
}
