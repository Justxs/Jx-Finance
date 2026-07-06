using FastEndpoints;
using JxFinance.Infrastructure.Auth;
using Microsoft.AspNetCore.Identity;

namespace JxFinance.Endpoints.Auth.Logout;

public sealed class LogoutEndpoint(SignInManager<AppUser> signInManager) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Post("/api/auth/logout");
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        await signInManager.SignOutAsync();
        await Send.NoContentAsync(ct);
    }
}
