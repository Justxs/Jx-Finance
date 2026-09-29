using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Imports.Interfaces;

namespace JxFinance.Endpoints.Imports.Preview;

public sealed class ImportPreviewEndpoint(IImportPreviewService importService)
    : Endpoint<ImportPreviewRequest, ImportPreviewResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Import + "/preview");
        Group<ImportsGroup>();
        AllowFileUploads();
    }

    public override async Task HandleAsync(ImportPreviewRequest req, CancellationToken ct)
    {
        await using var stream = req.File.OpenReadStream();
        await Send.OkOrProblemAsync(await importService.PreviewAsync(req.Format, req.AccountId, req.MappingId, stream, ct), ct);
    }
}
