using FastEndpoints;
using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.Accounts.UpdateAccount;

public sealed class UpdateAccountEndpoint(IAccountService accountService)
    : Endpoint<UpdateAccountRequest, AccountResponse>
{
    public override void Configure()
    {
        Put("/api/accounts/{id}");
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateAccountRequest req, CancellationToken ct)
    {
        var result = await accountService.UpdateAsync(req, ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.OkAsync(result.Value!, ct);
    }
}
