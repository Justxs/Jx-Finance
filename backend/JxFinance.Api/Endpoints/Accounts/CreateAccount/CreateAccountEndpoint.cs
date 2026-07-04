using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Accounts.GetAccount;

namespace JxFinance.Endpoints.Accounts.CreateAccount;

public sealed class CreateAccountEndpoint(IAccountService accountService)
    : Endpoint<CreateAccountRequest, AccountResponse>
{
    public override void Configure()
    {
        Post("/api/accounts");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CreateAccountRequest req, CancellationToken ct)
    {
        var result = await accountService.CreateAsync(req, ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.CreatedAtAsync<GetAccountEndpoint>(
            new { id = result.Value!.Id },
            result.Value,
            cancellation: ct);
    }
}
