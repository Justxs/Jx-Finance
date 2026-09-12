using FastEndpoints;
using JxFinance.Endpoints.Dashboard.Interfaces;
using JxFinance.Endpoints.Dashboard.Shared;

namespace JxFinance.Endpoints.Dashboard.GetMonthlyTrend;

public sealed class GetMonthlyTrendEndpoint(IDashboardService dashboardService)
    : Endpoint<GetMonthlyTrendRequest, MonthlyTrendResponse>
{
    public override void Configure()
    {
        Get("dashboard/monthly-trend");
        Group<DashboardGroup>();
    }

    public override async Task HandleAsync(GetMonthlyTrendRequest req, CancellationToken ct)
    {
        var response = await dashboardService.GetMonthlyTrendAsync(req.Months, ct);
        await Send.OkAsync(response, ct);
    }
}
