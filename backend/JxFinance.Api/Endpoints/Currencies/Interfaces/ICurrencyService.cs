using JxFinance.Domain.Common;
using JxFinance.Endpoints.Currencies.GetExchangeRate;
using JxFinance.Endpoints.Currencies.Shared;

namespace JxFinance.Endpoints.Currencies.Interfaces;

public interface ICurrencyService
{
    Task<CurrenciesResponse> GetCurrenciesAsync(CancellationToken cancellationToken);

    Task<Result<ExchangeRateResponse>> GetRateAsync(GetExchangeRateRequest request, CancellationToken cancellationToken);
}
