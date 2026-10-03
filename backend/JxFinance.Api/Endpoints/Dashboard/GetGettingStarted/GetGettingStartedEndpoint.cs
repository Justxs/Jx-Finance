using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Dashboard.Interfaces;
using JxFinance.Endpoints.Dashboard.Shared;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Dashboard.GetGettingStarted;

public sealed class GetGettingStartedEndpoint(IGettingStartedService gettingStarted, ICurrentUser currentUser)
    : EndpointWithoutRequest<IReadOnlyList<GettingStartedStepResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.Users + "/me/getting-started");
        Group<DashboardGroup>();
        Metadata(TokenReadable.No);
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkAsync(await gettingStarted.GetAsync(currentUser.Id, User.IsInRole(AppRoles.Admin), ct), ct);
}
