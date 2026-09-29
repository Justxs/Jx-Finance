using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Settings;
using JxFinance.Domain.Settings;
using JxFinance.Endpoints.Accounts.Interfaces;

namespace JxFinance.Endpoints.Accounts.GetCashFlowForecast;

public sealed class GetCashFlowForecastEndpoint(ICashFlowForecastService forecastService)
    : Endpoint<GetCashFlowForecastRequest, CashFlowForecastResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.Accounts + "/forecast");
        Group<AccountsGroup>();
        Options(b => b.WithMetadata(new RequiresFeature(Feature.RecurringBills)));
    }

    public override async Task HandleAsync(GetCashFlowForecastRequest req, CancellationToken ct) =>
        await Send.OkAsync(await forecastService.GetAsync(req.Days, ct), ct);
}
