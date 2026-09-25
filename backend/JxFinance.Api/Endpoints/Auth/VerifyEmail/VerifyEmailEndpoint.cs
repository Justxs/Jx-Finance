using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Auth.Interfaces;

namespace JxFinance.Endpoints.Auth.VerifyEmail;

public sealed class VerifyEmailEndpoint(IAccountEmailService accountEmails) : Endpoint<VerifyEmailRequest>
{
    public override void Configure()
    {
        Post(ApiRoutes.Auth + "/verify-email");
        Group<AuthGroup>();
        AllowAnonymous();
        Throttle(hitLimit: 10, durationSeconds: 300);
        Description(d => d.Produces(429));
    }

    public override async Task HandleAsync(VerifyEmailRequest req, CancellationToken ct) =>
        await Send.NoContentOrProblemAsync(await accountEmails.ConfirmEmailAsync(req.Email.Trim(), req.Token, ct), ct);
}
