using FastEndpoints;
using JxFinance.Endpoints.Accounts.Interfaces;
using JxFinance.Endpoints.Accounts.Shared;

namespace JxFinance.Endpoints.Accounts.GetArchivedAccounts;

public sealed class GetArchivedAccountsEndpoint(IAccountService accountService)
    : EndpointWithoutRequest<IReadOnlyList<ArchivedAccountResponse>>
{
    public override void Configure()
    {
        Get("accounts/archived");
        Group<AccountsGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var accounts = await accountService.GetArchivedAsync(ct);
        await Send.OkAsync(accounts, ct);
    }
}
