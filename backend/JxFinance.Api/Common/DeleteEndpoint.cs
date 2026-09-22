using FastEndpoints;
using JxFinance.Domain.Common;

namespace JxFinance.Common;

public abstract class DeleteEndpoint : EndpointWithoutRequest
{
    protected virtual string IdParameter => "id";

    protected abstract Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken ct);

    public sealed override async Task HandleAsync(CancellationToken ct)
    {
        await Send.NoContentOrProblemAsync(await DeleteAsync(Route<Guid>(IdParameter), ct), ct);
    }
}
