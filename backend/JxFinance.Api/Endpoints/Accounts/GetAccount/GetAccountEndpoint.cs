using FastEndpoints;
using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.Accounts.GetAccount;

public sealed class GetAccountEndpoint(IAccountService accountService)
    : EndpointWithoutRequest<AccountResponse>
{
    public override void Configure()
    {
        Get("/api/accounts/{id}");
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var result = await accountService.GetByIdAsync(Route<Guid>("id"), ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.OkAsync(result.Value!, ct);
    }
}
