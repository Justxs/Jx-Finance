using FastEndpoints;
using JxFinance.Endpoints.Reports.Interfaces;
using JxFinance.Endpoints.Reports.Shared;

namespace JxFinance.Endpoints.Reports.GetReportSummary;

public sealed class GetReportSummaryEndpoint(IReportService reportService) : Endpoint<GetReportSummaryRequest, ReportSummaryResponse>
{
    public override void Configure()
    {
        Get("reports/summary");
        Group<ReportsGroup>();
    }

    public override async Task HandleAsync(GetReportSummaryRequest req, CancellationToken ct)
    {
        var response = await reportService.GetSummaryAsync(
            req.DateFrom,
            req.DateTo,
            req.Comparison ?? ReportComparisonMode.None,
            ct);
        await Send.OkAsync(response, ct);
    }
}
