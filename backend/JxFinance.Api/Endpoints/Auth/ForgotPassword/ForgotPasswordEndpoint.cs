using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Auth.Interfaces;

namespace JxFinance.Endpoints.Auth.ForgotPassword;

public sealed class ForgotPasswordEndpoint(IAccountEmailService accountEmails) : Endpoint<ForgotPasswordRequest>
{
    public override void Configure()
    {
        Post(ApiRoutes.Auth + "/forgot-password");
        Group<AuthGroup>();
        AllowAnonymous();
        Throttle(hitLimit: 5, durationSeconds: 300);
        Description(d => d.Produces(429));
    }

    public override async Task HandleAsync(ForgotPasswordRequest req, CancellationToken ct)
    {
        await accountEmails.RequestPasswordResetAsync(req.Email.Trim(), ct);
        await Send.NoContentAsync(ct);
    }
}
