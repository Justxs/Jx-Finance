using FastEndpoints;
using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.Accounts.DeleteAccount;

public sealed class DeleteAccountEndpoint(IAccountService accountService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Delete("/api/accounts/{id}");
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var result = await accountService.ArchiveAsync(Route<Guid>("id"), ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.NoContentAsync(ct);
    }
}
