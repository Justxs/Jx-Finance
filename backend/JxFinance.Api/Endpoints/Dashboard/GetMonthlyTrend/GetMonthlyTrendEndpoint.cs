using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Dashboard.Interfaces;
using JxFinance.Endpoints.Dashboard.Shared;

namespace JxFinance.Endpoints.Dashboard.GetMonthlyTrend;

public sealed class GetMonthlyTrendEndpoint(IDashboardService dashboardService)
    : Endpoint<GetMonthlyTrendRequest, MonthlyTrendResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.Dashboard + "/monthly-trend");
        Group<DashboardGroup>();
    }

    public override async Task HandleAsync(GetMonthlyTrendRequest req, CancellationToken ct) =>
        await Send.OkAsync(await dashboardService.GetMonthlyTrendAsync(req.Months, ct), ct);
}
