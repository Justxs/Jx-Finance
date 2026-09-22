using System.Net.Mime;
using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Accounts.GetAccount;
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
        Description(d => d.ClearDefaultProduces(200).Produces<AccountResponse>(201, MediaTypeNames.Application.Json));
    }

    public override async Task HandleAsync(CreateAccountRequest req, CancellationToken ct)
    {
        var account = (await accountService.CreateAsync(req, ct)).ValueOrThrow();
        await Send.CreatedAtAsync<GetAccountEndpoint>(new { id = account.Id }, account, cancellation: ct);
    }
}
