using FastEndpoints;
using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.Imports.Confirm;

public sealed class ImportConfirmEndpoint(IImportService importService)
    : Endpoint<ImportConfirmRequest, ImportConfirmResponse>
{
    public override void Configure()
    {
        Post("/api/import/swedbank/confirm");
    }

    public override async Task HandleAsync(ImportConfirmRequest req, CancellationToken ct)
    {
        var result = await importService.ConfirmAsync(req, ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.OkAsync(result.Value!, ct);
    }
}
