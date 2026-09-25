using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Reports.Interfaces;
using JxFinance.Endpoints.Reports.Shared;

namespace JxFinance.Endpoints.Reports.GetReportSummary;

public sealed class GetReportSummaryEndpoint(IReportService reportService) : Endpoint<GetReportSummaryRequest, ReportSummaryResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.Reports + "/summary");
        Group<ReportsGroup>();
    }

    public override async Task HandleAsync(GetReportSummaryRequest req, CancellationToken ct) =>
        await Send.OkAsync(await reportService.GetSummaryAsync(req.DateFrom, req.DateTo, req.Comparison ?? ReportComparisonMode.None, ct), ct);
}
