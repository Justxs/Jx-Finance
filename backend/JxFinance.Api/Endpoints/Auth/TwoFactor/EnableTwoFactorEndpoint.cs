using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Auth.TwoFactor;

public sealed class EnableTwoFactorEndpoint(IAuthService authService, ICurrentUser currentUser)
    : Endpoint<EnableTwoFactorRequest, EnableTwoFactorResponse>
{
    public override void Configure()
    {
        Post("/api/auth/2fa/enable");
    }

    public override async Task HandleAsync(EnableTwoFactorRequest req, CancellationToken ct)
    {
        var user = await authService.FindByIdAsync(currentUser.Id, ct);
        if (user is null)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        var result = await authService.EnableTwoFactorAsync(user, req.Code);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.OkAsync(new EnableTwoFactorResponse(result.Value!), ct);
    }
}
