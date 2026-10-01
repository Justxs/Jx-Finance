using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Settings.Interfaces;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Settings.DeleteExchangeRate;

public sealed class DeleteExchangeRateEndpoint(IExchangeRateEntryService entryService) : Endpoint<DeleteExchangeRateRequest>
{
    public override void Configure()
    {
        Delete(ApiRoutes.Settings + "/exchange-rates/{currency}/{date}");
        Group<SettingsGroup>();
        Roles(AppRoles.Admin);
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(DeleteExchangeRateRequest req, CancellationToken ct) =>
        await Send.NoContentOrProblemAsync(await entryService.DeleteAsync(req, ct), ct);
}
