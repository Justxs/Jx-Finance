using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Accounts.Interfaces;
using JxFinance.Endpoints.Accounts.Shared;

namespace JxFinance.Endpoints.Accounts.GetArchivedAccounts;

public sealed class GetArchivedAccountsEndpoint(IAccountService accountService)
    : EndpointWithoutRequest<IReadOnlyList<ArchivedAccountResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.Accounts + "/archived");
        Group<AccountsGroup>();
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkAsync(await accountService.GetArchivedAsync(ct), ct);
}
