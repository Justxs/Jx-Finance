using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Imports.Interfaces;

namespace JxFinance.Endpoints.Imports.InspectCsv;

public sealed class InspectCsvEndpoint(IImportPreviewService importService) : Endpoint<InspectCsvRequest, InspectCsvResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Import + "/csv/inspect");
        Group<ImportsGroup>();
        AllowFileUploads();
    }

    public override async Task HandleAsync(InspectCsvRequest req, CancellationToken ct)
    {
        await using var stream = req.File.OpenReadStream();
        await Send.OkOrProblemAsync(await importService.InspectCsvAsync(stream, req.Encoding, req.Delimiter, req.SkipLines, ct), ct);
    }
}
