using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Auth.Interfaces;

namespace JxFinance.Endpoints.Auth.TwoFactor;

public sealed class EnableTwoFactorEndpoint(IAuthService authService, ICurrentUser currentUser, ISessionService sessions)
    : Endpoint<EnableTwoFactorRequest, EnableTwoFactorResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Auth + "/2fa/enable");
        Group<AuthGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(EnableTwoFactorRequest req, CancellationToken ct)
    {
        var user = await authService.FindByIdAsync(currentUser.Id, ct);
        if (user is null)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        var enabled = await authService.EnableTwoFactorAsync(user, req.Code);
        if (!enabled.TryGetValue(out var recoveryCodes))
        {
            await Send.ProblemAsync(enabled.Error, ct);
            return;
        }

        await sessions.RenewAsync(user, ct);
        await Send.OkAsync(new EnableTwoFactorResponse(recoveryCodes), ct);
    }
}
