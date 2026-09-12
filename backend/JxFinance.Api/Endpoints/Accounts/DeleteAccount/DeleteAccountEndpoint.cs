using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Accounts.Interfaces;

namespace JxFinance.Endpoints.Accounts.DeleteAccount;

public sealed class DeleteAccountEndpoint(IAccountService accountService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Delete("accounts/{id}");
        Group<AccountsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        (await accountService.ArchiveAsync(Route<Guid>("id"), ct)).EnsureSuccess();
        await Send.NoContentAsync(ct);
    }
}
