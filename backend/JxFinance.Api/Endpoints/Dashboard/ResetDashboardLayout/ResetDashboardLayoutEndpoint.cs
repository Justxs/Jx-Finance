using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Dashboard.Interfaces;
using JxFinance.Endpoints.Dashboard.Shared;

namespace JxFinance.Endpoints.Dashboard.ResetDashboardLayout;

public sealed class ResetDashboardLayoutEndpoint(IDashboardLayoutService layouts, ICurrentUser currentUser)
    : EndpointWithoutRequest<DashboardLayoutResponse>
{
    public override void Configure()
    {
        Delete(ApiRoutes.Users + "/me/dashboard-layout");
        Group<DashboardGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkAsync(await layouts.ResetAsync(currentUser.Id, ct), ct);
}
