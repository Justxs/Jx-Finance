using FastEndpoints;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Auth.TwoFactor;

public sealed class DisableTwoFactorEndpoint(IAuthService authService, ICurrentUser currentUser) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Post("/api/auth/2fa/disable");
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var user = await authService.FindByIdAsync(currentUser.Id, ct);
        if (user is null)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        await authService.DisableTwoFactorAsync(user);
        await Send.NoContentAsync(ct);
    }
}
