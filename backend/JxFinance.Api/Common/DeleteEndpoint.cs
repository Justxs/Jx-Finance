using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;

namespace JxFinance.Common;

public abstract class DeleteEndpoint : EndpointWithoutRequest
{
    protected virtual string IdParameter => "id";

    protected abstract Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken ct);

    public sealed override async Task HandleAsync(CancellationToken ct)
    {
        (await DeleteAsync(Route<Guid>(IdParameter), ct)).EnsureSuccess();
        await Send.NoContentAsync(ct);
    }
}
