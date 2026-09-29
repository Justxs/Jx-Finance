using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Settings.Interfaces;
using JxFinance.Endpoints.Settings.Shared;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Settings.GetReceiptSettings;

public sealed class GetReceiptSettingsEndpoint(ISettingsService settingsService)
    : EndpointWithoutRequest<ReceiptSettingsResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.Settings + "/receipts");
        Group<SettingsGroup>();
        Roles(AppRoles.Admin);
        Description(d => d.ProducesProblemDetails(403));
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkAsync(await settingsService.GetReceiptsAsync(ct), ct);
}
