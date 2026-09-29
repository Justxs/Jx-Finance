using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Auth.Interfaces;

namespace JxFinance.Endpoints.Auth.Tokens;

public sealed class CreatePersonalApiTokenEndpoint(IPersonalApiTokenService tokenService)
    : Endpoint<CreatePersonalApiTokenRequest, CreatedPersonalApiTokenResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Auth + "/tokens");
        Group<ApiTokensGroup>();
        Throttle(5, 300);
        Description(d => d.ProducesCreated<CreatedPersonalApiTokenResponse>().Produces(429).ProducesProblemDetails(404).ProducesProblemDetails(409));
    }

    public override async Task HandleAsync(CreatePersonalApiTokenRequest req, CancellationToken ct) =>
        await Send.CreatedOrProblemAsync(
            await tokenService.CreateAsync(req, ct),
            token => $"{ApiRoutes.AuthPath}/tokens/{token.Id}",
            ct);
}
