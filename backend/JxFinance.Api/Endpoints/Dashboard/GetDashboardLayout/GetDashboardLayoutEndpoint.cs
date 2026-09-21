using FastEndpoints;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Dashboard.Interfaces;
using JxFinance.Endpoints.Dashboard.Shared;

namespace JxFinance.Endpoints.Dashboard.GetDashboardLayout;

public sealed class GetDashboardLayoutEndpoint(IDashboardLayoutService layouts, ICurrentUser currentUser)
    : EndpointWithoutRequest<DashboardLayoutResponse>
{
    public override void Configure()
    {
        Get("users/me/dashboard-layout");
        Group<DashboardGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkAsync(await layouts.GetAsync(currentUser.Id, ct), ct);
}
