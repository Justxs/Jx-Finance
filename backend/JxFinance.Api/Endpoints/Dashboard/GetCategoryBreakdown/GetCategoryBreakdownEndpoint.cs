using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Dashboard.Interfaces;
using JxFinance.Endpoints.Dashboard.Shared;

namespace JxFinance.Endpoints.Dashboard.GetCategoryBreakdown;

public sealed class GetCategoryBreakdownEndpoint(IDashboardService dashboardService)
    : Endpoint<GetCategoryBreakdownRequest, CategoryBreakdownResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.Dashboard + "/category-breakdown");
        Group<DashboardGroup>();
    }

    public override async Task HandleAsync(GetCategoryBreakdownRequest req, CancellationToken ct) =>
        await Send.OkAsync(await dashboardService.GetCategoryBreakdownAsync(req.Month, ct), ct);
}
