using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Investments.Interfaces;

namespace JxFinance.Endpoints.Investments.DeleteInvestmentTransaction;

public sealed class DeleteInvestmentTransactionEndpoint(IInvestmentService investmentService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Delete("investments/transactions/{id}");
        Group<InvestmentsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        (await investmentService.DeleteTransactionAsync(Route<Guid>("id"), ct)).EnsureSuccess();
        await Send.NoContentAsync(ct);
    }
}
