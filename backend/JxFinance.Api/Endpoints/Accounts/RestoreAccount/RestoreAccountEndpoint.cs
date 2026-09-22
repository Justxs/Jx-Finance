using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Accounts.Interfaces;
using JxFinance.Endpoints.Accounts.Shared;

namespace JxFinance.Endpoints.Accounts.RestoreAccount;

public sealed class RestoreAccountEndpoint(IAccountService accountService)
    : EndpointWithoutRequest<AccountResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Accounts + "/{id}/restore");
        Group<AccountsGroup>();
        Description(d => d.ProducesProblemDetails(403).ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var account = (await accountService.RestoreAsync(Route<Guid>("id"), ct)).ValueOrThrow();
        await Send.OkAsync(account, ct);
    }
}
