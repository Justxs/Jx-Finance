using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Auth.Interfaces;

namespace JxFinance.Endpoints.Auth.Sessions;

public sealed class RevokeSessionEndpoint(ISessionService sessionService) : DeleteEndpoint
{
    public override void Configure()
    {
        Delete("auth/sessions/{id}");
        Group<AuthGroup>();
        Description(d => d.ProducesProblemDetails(403).ProducesProblemDetails(404));
    }

    protected override Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken ct) =>
        sessionService.RevokeAsync(id, ct);
}
