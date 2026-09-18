using FastEndpoints;
using JxFinance.Endpoints.Auth.Interfaces;

namespace JxFinance.Endpoints.Auth.Logout;

public sealed class LogoutEndpoint(ISessionService sessionService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Post("auth/logout");
        Group<AuthGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        await sessionService.SignOutAsync(ct);
        await Send.NoContentAsync(ct);
    }
}
