using FastEndpoints;

namespace JxFinance.Endpoints.Dashboard.GetDashboardSummary;

public sealed class GetDashboardSummaryEndpoint(IDashboardService dashboardService)
    : EndpointWithoutRequest<DashboardSummaryResponse>
{
    public override void Configure()
    {
        Get("/api/dashboard/summary");
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var summary = await dashboardService.GetSummaryAsync(ct);
        await Send.OkAsync(summary, ct);
    }
}
