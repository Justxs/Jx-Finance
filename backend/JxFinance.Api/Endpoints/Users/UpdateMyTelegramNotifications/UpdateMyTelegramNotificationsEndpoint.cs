using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Auth.Shared;
using JxFinance.Endpoints.Users.Interfaces;

namespace JxFinance.Endpoints.Users.UpdateMyTelegramNotifications;

public sealed class UpdateMyTelegramNotificationsEndpoint(IUserService userService)
    : Endpoint<UpdateMyTelegramNotificationsRequest, UserProfileResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Users + "/me/telegram-notifications");
        Group<UsersGroup>();
        Throttle(hitLimit: 20, durationSeconds: 300);
        Description(d => d.Produces(429));
    }

    public override async Task HandleAsync(UpdateMyTelegramNotificationsRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await userService.UpdateOwnTelegramNotificationsAsync(req, ct), ct);
}
