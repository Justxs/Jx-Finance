using FastEndpoints;
using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.Auth.Setup;

public sealed class SetupEndpoint(IAuthService authService) : Endpoint<SetupRequest, UserProfileResponse>
{
    public override void Configure()
    {
        Post("/api/setup");
        AllowAnonymous();
        Throttle(hitLimit: 5, durationSeconds: 300);
        Description(d => d.ProducesProblemDetails(409));
        Summary(s => s.Responses[409] = "Conflict");
    }

    public override async Task HandleAsync(SetupRequest req, CancellationToken ct)
    {
        var result = await authService.ProvisionAdminAsync(req.Email.Trim(), req.Password, req.DisplayName.Trim(), ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        var profile = await authService.ToProfileAsync(result.Value!);
        await Send.OkAsync(profile, ct);
    }
}
