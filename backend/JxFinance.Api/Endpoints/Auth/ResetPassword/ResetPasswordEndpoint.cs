using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Auth.Interfaces;

namespace JxFinance.Endpoints.Auth.ResetPassword;

public sealed class ResetPasswordEndpoint(IAccountEmailService accountEmails) : Endpoint<ResetPasswordRequest>
{
    public override void Configure()
    {
        Post("auth/reset-password");
        Group<AuthGroup>();
        AllowAnonymous();
        Throttle(hitLimit: 10, durationSeconds: 300);
        Description(d => d.Produces(429));
    }

    public override async Task HandleAsync(ResetPasswordRequest req, CancellationToken ct)
    {
        (await accountEmails.ResetPasswordAsync(req.Email.Trim(), req.Token, req.NewPassword, ct)).EnsureSuccess();
        await Send.NoContentAsync(ct);
    }
}
