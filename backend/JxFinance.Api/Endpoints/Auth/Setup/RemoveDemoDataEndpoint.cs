using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Auth.Interfaces;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Auth.Setup;

public sealed class RemoveDemoDataEndpoint(IDemoDataService demoData, ICurrentUser currentUser) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Delete(ApiRoutes.Setup + "/demo-data");
        Group<SetupGroup>();
        Roles(AppRoles.Admin);
        Description(d => d.ProducesProblemDetails(409));
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.NoContentOrProblemAsync(await demoData.RemoveAsync(currentUser.Id, ct), ct);
}
