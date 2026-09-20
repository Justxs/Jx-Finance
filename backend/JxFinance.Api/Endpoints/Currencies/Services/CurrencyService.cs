using System.Globalization;
using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Currencies.GetExchangeRate;
using JxFinance.Endpoints.Currencies.Interfaces;
using JxFinance.Endpoints.Currencies.Shared;

namespace JxFinance.Endpoints.Currencies.Services;

[RegisterService<ICurrencyService>(LifeTime.Scoped)]
public sealed class CurrencyService(IExchangeRateService rates, IInstanceSettingsStore settings) : ICurrencyService
{
    public async Task<CurrenciesResponse> GetCurrenciesAsync(CancellationToken cancellationToken)
    {
        var latest = await rates.GetLatestAsync(cancellationToken);
        return new CurrenciesResponse(settings.Current.ReportingCurrency, settings.Current.UsableCurrencies, latest.AsOf);
    }

    public async Task<Result<ExchangeRateResponse>> GetRateAsync(
        GetExchangeRateRequest request,
        CancellationToken cancellationToken)
    {
        var table = request.Date is { } date
            ? await rates.GetForDateAsync(date, cancellationToken)
            : await rates.GetLatestAsync(cancellationToken);

        if (table.Rate(request.From, request.To) is not { } rate || table.AsOf is not { } asOf)
        {
            return new DomainError(
                ErrorCodes.ResourceNotFound,
                $"No exchange rate is available for {request.From.ToCode()} to {request.To.ToCode()}.");
        }

        return new ExchangeRateResponse(
            request.From,
            request.To,
            decimal.Round(rate, 6).ToString("0.000000", CultureInfo.InvariantCulture),
            asOf);
    }
}
