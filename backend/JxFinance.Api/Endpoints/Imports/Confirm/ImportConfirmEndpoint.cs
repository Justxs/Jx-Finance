using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Imports.Interfaces;

namespace JxFinance.Endpoints.Imports.Confirm;

public sealed class ImportConfirmEndpoint(IImportService importService)
    : Endpoint<ImportConfirmRequest, ImportConfirmResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Import + "/swedbank/confirm");
        Group<ImportsGroup>();
    }

    public override async Task HandleAsync(ImportConfirmRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await importService.ConfirmAsync(req, ct), ct);
}
