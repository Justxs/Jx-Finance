using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Accounts.Interfaces;
using JxFinance.Endpoints.Accounts.Shared;

namespace JxFinance.Endpoints.Accounts.UpdateAccount;

public sealed class UpdateAccountEndpoint(IAccountService accountService)
    : Endpoint<UpdateAccountRequest, AccountResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Accounts + "/{id}");
        Group<AccountsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateAccountRequest req, CancellationToken ct)
    {
        await Send.OkOrProblemAsync(await accountService.UpdateAsync(req, ct), ct);
    }
}
