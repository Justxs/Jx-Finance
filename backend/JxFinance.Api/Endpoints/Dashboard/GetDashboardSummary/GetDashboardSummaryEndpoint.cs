using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.SettleUp;
using JxFinance.Endpoints.Dashboard.Interfaces;
using JxFinance.Endpoints.Dashboard.Shared;

namespace JxFinance.Endpoints.Dashboard.GetDashboardSummary;

public sealed class GetDashboardSummaryEndpoint(IDashboardService dashboardService)
    : Endpoint<GetDashboardSummaryRequest, DashboardSummaryResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.Dashboard + "/summary");
        Group<DashboardGroup>();
    }

    public override async Task HandleAsync(GetDashboardSummaryRequest req, CancellationToken ct) =>
        await Send.OkAsync(await dashboardService.GetSummaryAsync(req.Month, req.Share ?? SpendingShare.Full, ct), ct);
}
