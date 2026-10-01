using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Imports.Interfaces;

namespace JxFinance.Endpoints.Imports.Confirm;

public sealed class ImportConfirmEndpoint(IImportConfirmService importService)
    : Endpoint<ImportConfirmRequest, ImportConfirmResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Import + "/confirm");
        Group<ImportsGroup>();
        Description(d => d.ProducesProblemDetails(403).ProducesProblemDetails(404).ProducesProblemDetails(409));
    }

    public override async Task HandleAsync(ImportConfirmRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await importService.ConfirmAsync(req, ct), ct);
}
