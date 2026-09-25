using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Currencies.Interfaces;
using JxFinance.Endpoints.Currencies.Shared;

namespace JxFinance.Endpoints.Currencies.GetCurrencies;

public sealed class GetCurrenciesEndpoint(ICurrencyService currencyService) : EndpointWithoutRequest<CurrenciesResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.Currencies);
        Group<CurrenciesGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkAsync(await currencyService.GetCurrenciesAsync(ct), ct);
}
