using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Accounts.Interfaces;
using JxFinance.Endpoints.Accounts.Shared;

namespace JxFinance.Endpoints.Accounts.GetAccount;

public sealed class GetAccountEndpoint(IAccountService accountService)
    : EndpointWithoutRequest<AccountResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.Accounts + "/{id}");
        Group<AccountsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        await Send.OkOrProblemAsync(await accountService.GetByIdAsync(Route<Guid>("id"), ct), ct);
    }
}
