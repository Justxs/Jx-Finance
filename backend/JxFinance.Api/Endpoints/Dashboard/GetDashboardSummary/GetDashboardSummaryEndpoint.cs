using FastEndpoints;
using JxFinance.Endpoints.Dashboard.Interfaces;
using JxFinance.Endpoints.Dashboard.Shared;

namespace JxFinance.Endpoints.Dashboard.GetDashboardSummary;

public sealed class GetDashboardSummaryEndpoint(IDashboardService dashboardService)
    : EndpointWithoutRequest<DashboardSummaryResponse>
{
    public override void Configure()
    {
        Get("dashboard/summary");
        Group<DashboardGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var summary = await dashboardService.GetSummaryAsync(ct);
        await Send.OkAsync(summary, ct);
    }
}
