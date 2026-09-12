using FastEndpoints;
using JxFinance.Endpoints.Accounts.Interfaces;
using JxFinance.Endpoints.Accounts.Shared;

namespace JxFinance.Endpoints.Accounts.GetAccounts;

public sealed class GetAccountsEndpoint(IAccountService accountService)
    : EndpointWithoutRequest<IReadOnlyList<AccountResponse>>
{
    public override void Configure()
    {
        Get("accounts");
        Group<AccountsGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var accounts = await accountService.GetAllAsync(ct);
        await Send.OkAsync(accounts, ct);
    }
}
