using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Investments.Interfaces;
using JxFinance.Endpoints.Investments.Shared;

namespace JxFinance.Endpoints.Investments.ImportBrokerReport;

public sealed class ImportBrokerReportEndpoint(IBrokerImportService importService)
    : Endpoint<ImportBrokerReportRequest, BrokerImportResponse>
{
    public override void Configure()
    {
        Post("investments/import/interactive-brokers");
        Group<InvestmentsGroup>();
        AllowFileUploads();
    }

    public override async Task HandleAsync(ImportBrokerReportRequest req, CancellationToken ct)
    {
        if (req.File is null || req.File.Length is <= 0 or > 20 * 1024 * 1024)
        {
            ThrowError(r => r.File, "Choose a non-empty Flex Query XML file no larger than 20 MB.", ErrorCodes.ImportInvalidFile);
        }

        await using var stream = req.File.OpenReadStream();
        var result = (await importService.ImportAsync(req.AccountId, req.FundingAccountId, stream, ct)).ValueOrThrow();
        await Send.OkAsync(result, ct);
    }
}
