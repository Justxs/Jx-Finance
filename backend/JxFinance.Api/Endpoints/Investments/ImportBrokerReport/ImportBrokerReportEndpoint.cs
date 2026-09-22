using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Investments.Interfaces;
using JxFinance.Endpoints.Investments.Shared;

namespace JxFinance.Endpoints.Investments.ImportBrokerReport;

public sealed class ImportBrokerReportEndpoint(IBrokerImportService importService)
    : Endpoint<ImportBrokerReportRequest, BrokerImportResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Investments + "/import/interactive-brokers");
        Group<InvestmentsGroup>();
        AllowFileUploads();
        Description(d => d.ProducesProblemDetails(409));
    }

    public override async Task HandleAsync(ImportBrokerReportRequest req, CancellationToken ct)
    {
        if (req.File is null || req.File.Length is <= 0 or > 20 * 1024 * 1024)
        {
            AddError(r => r.File, "Choose a non-empty Flex Query XML file no larger than 20 MB.", ErrorCodes.ImportInvalidFile);
            await Send.ErrorsAsync(cancellation: ct);
            return;
        }

        await using var stream = req.File.OpenReadStream();
        await Send.OkOrProblemAsync(await importService.ImportAsync(req.AccountId, req.FundingAccountId, stream, ct), ct);
    }
}
