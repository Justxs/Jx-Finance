using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Auth.Shared;
using JxFinance.Endpoints.Users.Interfaces;

namespace JxFinance.Endpoints.Users.UpdateMyDiscordNotifications;

public sealed class UpdateMyDiscordNotificationsEndpoint(IUserService userService)
    : Endpoint<UpdateMyDiscordNotificationsRequest, UserProfileResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Users + "/me/discord-notifications");
        Group<UsersGroup>();
        Throttle(hitLimit: 20, durationSeconds: 300);
        Description(d => d.Produces(429));
    }

    public override async Task HandleAsync(UpdateMyDiscordNotificationsRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await userService.UpdateOwnDiscordNotificationsAsync(req, ct), ct);
}
