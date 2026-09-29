using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Auth.Shared;
using JxFinance.Endpoints.Users.Interfaces;

namespace JxFinance.Endpoints.Users.UpdateMyLanguage;

public sealed class UpdateMyLanguageEndpoint(IUserService userService)
    : Endpoint<UpdateMyLanguageRequest, UserProfileResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Users + "/me/language");
        Group<UsersGroup>();
        Throttle(hitLimit: 20, durationSeconds: 300);
        Description(d => d.Produces(429));
    }

    public override async Task HandleAsync(UpdateMyLanguageRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await userService.UpdateOwnLanguageAsync(req, ct), ct);
}
