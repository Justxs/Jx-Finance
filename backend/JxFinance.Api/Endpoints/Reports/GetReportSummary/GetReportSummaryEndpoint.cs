using FastEndpoints;

namespace JxFinance.Endpoints.Reports.GetReportSummary;

public sealed class GetReportSummaryEndpoint(IReportService reportService) : Endpoint<GetReportSummaryRequest, ReportSummaryResponse>
{
    public override void Configure()
    {
        Get("/api/reports/summary");
    }

    public override async Task HandleAsync(GetReportSummaryRequest req, CancellationToken ct)
    {
        var response = await reportService.GetSummaryAsync(req.DateFrom, req.DateTo, ct);
        await Send.OkAsync(response, ct);
    }
}
