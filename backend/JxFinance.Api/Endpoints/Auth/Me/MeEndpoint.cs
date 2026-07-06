using FastEndpoints;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Auth.Me;

public sealed class MeEndpoint(IAuthService authService, ICurrentUser currentUser)
    : EndpointWithoutRequest<UserProfileResponse>
{
    public override void Configure()
    {
        Get("/api/auth/me");
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
