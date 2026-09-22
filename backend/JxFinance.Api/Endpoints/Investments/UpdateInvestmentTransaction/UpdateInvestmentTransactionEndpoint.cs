using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Investments.Interfaces;
using JxFinance.Endpoints.Investments.Shared;

namespace JxFinance.Endpoints.Investments.UpdateInvestmentTransaction;

public sealed class UpdateInvestmentTransactionEndpoint(IInvestmentService investmentService)
    : Endpoint<UpdateInvestmentTransactionRequest, InvestmentTransactionResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Investments + "/transactions/{id}");
        Group<InvestmentsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(UpdateInvestmentTransactionRequest req, CancellationToken ct)
    {
        var updated = (await investmentService.UpdateTransactionAsync(req, ct)).ValueOrThrow();
        await Send.OkAsync(updated, ct);
    }
}
