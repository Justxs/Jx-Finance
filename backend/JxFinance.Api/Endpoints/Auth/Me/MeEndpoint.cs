using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Auth.Interfaces;
using JxFinance.Endpoints.Auth.Shared;

namespace JxFinance.Endpoints.Auth.Me;

public sealed class MeEndpoint(IAuthService authService, ICurrentUser currentUser)
    : EndpointWithoutRequest<UserProfileResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.Auth + "/me");
        Group<AuthGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var profile = await authService.GetProfileByIdAsync(currentUser.Id, ct);
        if (profile is null)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        await Send.OkAsync(profile, ct);
    }
}
