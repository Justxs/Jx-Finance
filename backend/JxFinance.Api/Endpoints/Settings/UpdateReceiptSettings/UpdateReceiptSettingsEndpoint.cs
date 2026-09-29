using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Settings.Interfaces;
using JxFinance.Endpoints.Settings.Shared;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Settings.UpdateReceiptSettings;

public sealed class UpdateReceiptSettingsEndpoint(ISettingsService settingsService)
    : Endpoint<UpdateReceiptSettingsRequest, ReceiptSettingsResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Settings + "/receipts");
        Group<SettingsGroup>();
        Roles(AppRoles.Admin);
        Description(d => d.ProducesProblemDetails(403));
    }

    public override async Task HandleAsync(UpdateReceiptSettingsRequest req, CancellationToken ct) =>
        await Send.OkAsync(await settingsService.UpdateReceiptsAsync(req, ct), ct);
}
