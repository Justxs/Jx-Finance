using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Auth.Interfaces;

namespace JxFinance.Endpoints.Auth.Tokens;

public sealed class RevokePersonalApiTokenEndpoint(IPersonalApiTokenService tokenService) : DeleteEndpoint
{
    public override void Configure()
    {
        Delete(ApiRoutes.Auth + "/tokens/{id}");
        Group<ApiTokensGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    protected override Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken ct) =>
        tokenService.RevokeAsync(id, ct);
}
