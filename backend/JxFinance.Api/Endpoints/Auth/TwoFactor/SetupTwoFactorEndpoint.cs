using FastEndpoints;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Auth.TwoFactor;

public sealed class SetupTwoFactorEndpoint(IAuthService authService, ICurrentUser currentUser)
    : EndpointWithoutRequest<TwoFactorSetupResponse>
{
    public override void Configure()
    {
        Post("/api/auth/2fa/setup");
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var user = await authService.FindByIdAsync(currentUser.Id, ct);
        if (user is null)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        var setup = await authService.BeginTwoFactorSetupAsync(user);
        await Send.OkAsync(setup, ct);
    }
}
