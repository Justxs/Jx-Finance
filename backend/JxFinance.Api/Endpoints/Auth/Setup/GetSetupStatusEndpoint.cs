using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Auth.Interfaces;

namespace JxFinance.Endpoints.Auth.Setup;

public sealed class GetSetupStatusEndpoint(IAuthService authService) : EndpointWithoutRequest<SetupStatusResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.Setup + "/status");
        Group<SetupGroup>();
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkAsync(new SetupStatusResponse(await authService.IsSetupNeededAsync(ct)), ct);
}
