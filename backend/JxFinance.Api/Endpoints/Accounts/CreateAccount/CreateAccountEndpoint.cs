using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Accounts.Interfaces;
using JxFinance.Endpoints.Accounts.Shared;

namespace JxFinance.Endpoints.Accounts.CreateAccount;

public sealed class CreateAccountEndpoint(IAccountService accountService)
    : Endpoint<CreateAccountRequest, AccountResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Accounts);
        Group<AccountsGroup>();
        Description(d => d.ProducesCreated<AccountResponse>());
    }

    public override async Task HandleAsync(CreateAccountRequest req, CancellationToken ct)
    {
        await Send.CreatedOrProblemAsync(await accountService.CreateAsync(req, ct), account => $"{ApiRoutes.AccountsPath}/{account.Id}", ct);
    }
}
