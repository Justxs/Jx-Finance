using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Imports;

namespace JxFinance.Endpoints.Imports.Preview;

public sealed class ImportPreviewEndpoint(IImportService importService)
    : Endpoint<ImportPreviewRequest, ImportPreviewResponse>
{
    public override void Configure()
    {
        Post("/api/import/swedbank/preview");
        AllowFileUploads();
    }

    public override async Task HandleAsync(ImportPreviewRequest req, CancellationToken ct)
    {
        if (req.File is null || req.File.Length is <= 0 or > 5 * 1024 * 1024)
        {
            AddError("Choose a non-empty CSV file no larger than 5 MB.");
            await Send.ErrorsAsync(cancellation: ct);
            return;
        }
        await using var stream = req.File.OpenReadStream();
        var result = await importService.PreviewSwedbankCsvAsync(req.AccountId, stream, ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.OkAsync(result.Value!, ct);
    }
}
