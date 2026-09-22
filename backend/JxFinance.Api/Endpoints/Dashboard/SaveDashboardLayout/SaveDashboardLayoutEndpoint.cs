using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Dashboard.Interfaces;
using JxFinance.Endpoints.Dashboard.Shared;

namespace JxFinance.Endpoints.Dashboard.SaveDashboardLayout;

public sealed class SaveDashboardLayoutEndpoint(IDashboardLayoutService layouts, ICurrentUser currentUser)
    : Endpoint<SaveDashboardLayoutRequest, DashboardLayoutResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Users + "/me/dashboard-layout");
        Group<DashboardGroup>();
    }

    public override async Task HandleAsync(SaveDashboardLayoutRequest req, CancellationToken ct) =>
        await Send.OkAsync(await layouts.SaveAsync(currentUser.Id, req, ct), ct);
}
