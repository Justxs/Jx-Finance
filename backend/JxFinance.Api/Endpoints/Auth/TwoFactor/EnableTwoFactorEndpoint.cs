using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Auth.Interfaces;

namespace JxFinance.Endpoints.Auth.TwoFactor;

public sealed class EnableTwoFactorEndpoint(IAuthService authService, ICurrentUser currentUser, ISessionService sessions)
    : Endpoint<EnableTwoFactorRequest, EnableTwoFactorResponse>
{
    public override void Configure()
    {
        Post("auth/2fa/enable");
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

        var recoveryCodes = (await authService.EnableTwoFactorAsync(user, req.Code)).ValueOrThrow();
        await sessions.RenewAsync(user, ct);
        await Send.OkAsync(new EnableTwoFactorResponse(recoveryCodes), ct);
    }
}
