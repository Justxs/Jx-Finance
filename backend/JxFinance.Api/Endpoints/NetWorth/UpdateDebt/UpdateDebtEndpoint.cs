using FastEndpoints;
using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.NetWorth.UpdateDebt;

public sealed class UpdateDebtEndpoint(INetWorthService netWorthService) : Endpoint<UpdateDebtRequest, DebtResponse>
{
    public override void Configure()
    {
        Put("/api/debts/{id}");
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateDebtRequest req, CancellationToken ct)
    {
        var result = await netWorthService.UpdateDebtAsync(req, ct);
        if (result.IsFailure)
        {
            await Send.ResultAsync(result.ToProblemResult());
            return;
        }

        await Send.OkAsync(result.Value!, ct);
    }
}
