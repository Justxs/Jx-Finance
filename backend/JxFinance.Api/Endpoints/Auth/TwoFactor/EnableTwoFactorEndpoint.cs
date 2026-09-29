using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Auth.Interfaces;

namespace JxFinance.Endpoints.Auth.TwoFactor;

public sealed class EnableTwoFactorEndpoint(IAuthService authService)
    : Endpoint<EnableTwoFactorRequest, EnableTwoFactorResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Auth + "/2fa/enable");
        Group<AuthGroup>();
        Throttle(5, 300);
        Description(d => d.Produces(429).ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(EnableTwoFactorRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync((await authService.EnableTwoFactorAsync(req.Code, ct)).Map(codes => new EnableTwoFactorResponse(codes)), ct);
}
