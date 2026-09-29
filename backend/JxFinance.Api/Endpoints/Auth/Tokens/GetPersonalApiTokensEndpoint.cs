using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Auth.Interfaces;

namespace JxFinance.Endpoints.Auth.Tokens;

public sealed class GetPersonalApiTokensEndpoint(IPersonalApiTokenService tokenService)
    : EndpointWithoutRequest<IReadOnlyList<PersonalApiTokenResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.Auth + "/tokens");
        Group<ApiTokensGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkAsync(await tokenService.ListAsync(ct), ct);
}
