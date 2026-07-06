using FastEndpoints;

namespace JxFinance.Endpoints.Dashboard.GetMonthlyTrend;

public sealed class GetMonthlyTrendEndpoint(IDashboardService dashboardService)
    : Endpoint<GetMonthlyTrendRequest, MonthlyTrendResponse>
{
    public override void Configure()
    {
        Get("/api/dashboard/monthly-trend");
    }

    public override async Task HandleAsync(GetMonthlyTrendRequest req, CancellationToken ct)
    {
        var response = await dashboardService.GetMonthlyTrendAsync(req.Months, ct);
        await Send.OkAsync(response, ct);
    }
}
