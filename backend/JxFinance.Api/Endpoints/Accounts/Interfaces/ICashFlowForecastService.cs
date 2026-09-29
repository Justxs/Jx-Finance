using JxFinance.Endpoints.Accounts.GetCashFlowForecast;

namespace JxFinance.Endpoints.Accounts.Interfaces;

public interface ICashFlowForecastService
{
    Task<CashFlowForecastResponse> GetAsync(int days, CancellationToken cancellationToken);
}
