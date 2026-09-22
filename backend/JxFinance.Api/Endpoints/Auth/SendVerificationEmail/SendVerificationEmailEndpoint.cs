using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Auth.Interfaces;

namespace JxFinance.Endpoints.Auth.SendVerificationEmail;

public sealed class SendVerificationEmailEndpoint(IAccountEmailService accountEmails, ICurrentUser currentUser)
    : EndpointWithoutRequest
{
    public override void Configure()
    {
        Post(ApiRoutes.Auth + "/send-verification-email");
        Group<AuthGroup>();
        Throttle(hitLimit: 5, durationSeconds: 300);
        Description(d => d.Produces(429).ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        (await accountEmails.SendVerificationAsync(currentUser.Id, ct)).EnsureSuccess();
        await Send.NoContentAsync(ct);
    }
}
