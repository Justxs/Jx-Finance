using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Auth.Interfaces;
using JxFinance.Endpoints.Auth.Shared;
using JxFinance.Endpoints.Users.Interfaces;
using JxFinance.Infrastructure.Auth;
using Microsoft.AspNetCore.Identity;

namespace JxFinance.Endpoints.Users.UpdateMyProfile;

public sealed class UpdateMyProfileEndpoint(IUserService userService, ICurrentUser currentUser, UserManager<AppUser> users, ISessionService sessions)
    : Endpoint<UpdateMyProfileRequest, UserProfileResponse>
{
    public override void Configure()
    {
        Put("users/me");
        Group<UsersGroup>();
        Throttle(hitLimit: 10, durationSeconds: 300);
    }

    public override async Task HandleAsync(UpdateMyProfileRequest req, CancellationToken ct)
    {
        var profile = (await userService.UpdateOwnProfileAsync(currentUser.Id, req, ct)).ValueOrThrow();

        if (req.NewPassword is not null)
        {
            var user = await users.FindByIdAsync(currentUser.Id.ToString());
            if (user is not null) await sessions.RenewAsync(user, ct);
        }

        await Send.OkAsync(profile, ct);
    }
}
