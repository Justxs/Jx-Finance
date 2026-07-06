using FastEndpoints;

namespace JxFinance.Endpoints.Dashboard.GetCategoryBreakdown;

public sealed class GetCategoryBreakdownEndpoint(IDashboardService dashboardService)
    : Endpoint<GetCategoryBreakdownRequest, CategoryBreakdownResponse>
{
    public override void Configure()
    {
        Get("/api/dashboard/category-breakdown");
    }

    public override async Task HandleAsync(GetCategoryBreakdownRequest req, CancellationToken ct)
    {
        var response = await dashboardService.GetCategoryBreakdownAsync(req.Month, ct);
        await Send.OkAsync(response, ct);
    }
}
