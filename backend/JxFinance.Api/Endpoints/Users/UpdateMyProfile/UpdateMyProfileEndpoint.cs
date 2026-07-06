using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Auth;

namespace JxFinance.Endpoints.Users.UpdateMyProfile;

public sealed class UpdateMyProfileEndpoint(IUserService userService, ICurrentUser currentUser)
    : Endpoint<UpdateMyProfileRequest, UserProfileResponse>
{
    public override void Configure()
    {
        Put("/api/users/me");
    }

    public override async Task HandleAsync(UpdateMyProfileRequest req, CancellationToken ct)
    {
        var result = await userService.UpdateOwnProfileAsync(currentUser.Id, req, ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.OkAsync(result.Value!, ct);
    }
}
