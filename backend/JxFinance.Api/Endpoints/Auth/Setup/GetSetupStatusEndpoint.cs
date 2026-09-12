using FastEndpoints;
using JxFinance.Endpoints.Auth.Interfaces;

namespace JxFinance.Endpoints.Auth.Setup;

public sealed class GetSetupStatusEndpoint(IAuthService authService) : EndpointWithoutRequest<SetupStatusResponse>
{
    public override void Configure()
    {
        Get("setup/status");
        Group<SetupGroup>();
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var needsSetup = await authService.IsSetupNeededAsync(ct);
        await Send.OkAsync(new SetupStatusResponse(needsSetup), ct);
    }
}
