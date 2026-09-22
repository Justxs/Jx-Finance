using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Currencies.Interfaces;
using JxFinance.Endpoints.Currencies.Shared;

namespace JxFinance.Endpoints.Currencies.GetExchangeRate;

public sealed class GetExchangeRateEndpoint(ICurrencyService currencyService)
    : Endpoint<GetExchangeRateRequest, ExchangeRateResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.ExchangeRates);
        Group<CurrenciesGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(GetExchangeRateRequest req, CancellationToken ct)
    {
        var rate = (await currencyService.GetRateAsync(req, ct)).ValueOrThrow();
        await Send.OkAsync(rate, ct);
    }
}
