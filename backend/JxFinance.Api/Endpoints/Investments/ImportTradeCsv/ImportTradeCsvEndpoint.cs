using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Investments.Interfaces;
using JxFinance.Endpoints.Investments.Shared;

namespace JxFinance.Endpoints.Investments.ImportTradeCsv;

public sealed class ImportTradeCsvEndpoint(IBrokerImportService importService)
    : Endpoint<ImportTradeCsvRequest, BrokerImportResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Investments + "/import/trade-csv");
        Group<InvestmentsGroup>();
        AllowFileUploads();
        Description(d => d.ProducesProblemDetails(409));
    }

    public override async Task HandleAsync(ImportTradeCsvRequest req, CancellationToken ct)
    {
        if (req.File is null || req.File.Length is <= 0 or > 5 * 1024 * 1024)
        {
            AddError(r => r.File, "Choose a non-empty trade CSV no larger than 5 MB.", ErrorCodes.ImportInvalidFile);
            await Send.ErrorsAsync(cancellation: ct);
            return;
        }

        await using var stream = req.File.OpenReadStream();
        await Send.OkOrProblemAsync(await importService.ImportTradeCsvAsync(req.AccountId, stream, ct), ct);
    }
}
