using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Imports.Interfaces;

namespace JxFinance.Endpoints.Imports.Preview;

public sealed class ImportPreviewEndpoint(IImportService importService)
    : Endpoint<ImportPreviewRequest, ImportPreviewResponse>
{
    public override void Configure()
    {
        Post("import/swedbank/preview");
        Group<ImportsGroup>();
        AllowFileUploads();
    }

    public override async Task HandleAsync(ImportPreviewRequest req, CancellationToken ct)
    {
        if (req.File is null || req.File.Length is <= 0 or > 5 * 1024 * 1024)
            ThrowError(r => r.File, "Choose a non-empty CSV file no larger than 5 MB.", ErrorCodes.Validation);

        await using var stream = req.File.OpenReadStream();
        var preview = (await importService.PreviewSwedbankCsvAsync(req.AccountId, stream, ct)).ValueOrThrow();
        await Send.OkAsync(preview, ct);
    }
}
