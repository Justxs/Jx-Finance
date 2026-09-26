using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Auth.Shared;
using JxFinance.Endpoints.Users.Interfaces;

namespace JxFinance.Endpoints.Users.UpdateMyProfile;

public sealed class UpdateMyProfileEndpoint(IUserService userService) : Endpoint<UpdateMyProfileRequest, UserProfileResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Users + "/me");
        Group<UsersGroup>();
        Throttle(hitLimit: 10, durationSeconds: 300);
    }

    public override async Task HandleAsync(UpdateMyProfileRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await userService.UpdateOwnProfileAsync(req, ct), ct);
}
