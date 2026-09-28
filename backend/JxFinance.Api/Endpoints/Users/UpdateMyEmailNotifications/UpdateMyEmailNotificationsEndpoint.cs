using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Auth.Shared;
using JxFinance.Endpoints.Users.Interfaces;

namespace JxFinance.Endpoints.Users.UpdateMyEmailNotifications;

public sealed class UpdateMyEmailNotificationsEndpoint(IUserService userService)
    : Endpoint<UpdateMyEmailNotificationsRequest, UserProfileResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Users + "/me/email-notifications");
        Group<UsersGroup>();
        Throttle(hitLimit: 20, durationSeconds: 300);
        Description(d => d.Produces(429));
    }

    public override async Task HandleAsync(UpdateMyEmailNotificationsRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await userService.UpdateOwnEmailNotificationsAsync(req, ct), ct);
}
