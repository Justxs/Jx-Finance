using FastEndpoints;
using JxFinance.Endpoints.Accounts.Interfaces;
using JxFinance.Endpoints.Accounts.Shared;

namespace JxFinance.Endpoints.Accounts.GetAccounts;

public sealed class GetAccountsEndpoint(IAccountService accountService)
    : Endpoint<GetAccountsRequest, IReadOnlyList<AccountResponse>>
{
    public override void Configure()
    {
        Get("accounts");
        Group<AccountsGroup>();
    }

    public override async Task HandleAsync(GetAccountsRequest req, CancellationToken ct)
    {
        var accounts = await accountService.GetAllAsync(req, ct);
        await Send.OkAsync(accounts, ct);
    }
}
