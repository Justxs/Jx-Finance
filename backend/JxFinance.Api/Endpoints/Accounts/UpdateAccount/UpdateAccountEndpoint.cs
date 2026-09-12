using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Accounts.Interfaces;
using JxFinance.Endpoints.Accounts.Shared;

namespace JxFinance.Endpoints.Accounts.UpdateAccount;

public sealed class UpdateAccountEndpoint(IAccountService accountService)
    : Endpoint<UpdateAccountRequest, AccountResponse>
{
    public override void Configure()
    {
        Put("accounts/{id}");
        Group<AccountsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateAccountRequest req, CancellationToken ct)
    {
        var account = (await accountService.UpdateAsync(req, ct)).ValueOrThrow();
        await Send.OkAsync(account, ct);
    }
}
