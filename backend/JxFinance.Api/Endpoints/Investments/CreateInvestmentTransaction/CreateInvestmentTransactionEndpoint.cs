using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Investments.Interfaces;
using JxFinance.Endpoints.Investments.Shared;

namespace JxFinance.Endpoints.Investments.CreateInvestmentTransaction;

public sealed class CreateInvestmentTransactionEndpoint(IInvestmentService investmentService)
    : Endpoint<CreateInvestmentTransactionRequest, InvestmentTransactionResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Investments + "/transactions");
        Group<InvestmentsGroup>();
        Description(d => d.ProducesCreated<InvestmentTransactionResponse>());
    }

    public override async Task HandleAsync(CreateInvestmentTransactionRequest req, CancellationToken ct)
    {
        await Send.CreatedOrProblemAsync(await investmentService.CreateTransactionAsync(req, ct), created => $"{ApiRoutes.InvestmentsPath}/transactions/{created.Id}", ct);
    }
}
