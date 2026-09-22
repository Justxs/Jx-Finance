using System.Net.Mime;
using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
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
        Description(d => d.ClearDefaultProduces(200).Produces<InvestmentTransactionResponse>(201, MediaTypeNames.Application.Json));
    }

    public override async Task HandleAsync(CreateInvestmentTransactionRequest req, CancellationToken ct)
    {
        var created = (await investmentService.CreateTransactionAsync(req, ct)).ValueOrThrow();
        await Send.ResultAsync(TypedResults.Created($"{ApiRoutes.InvestmentsPath}/transactions/{created.Id}", created));
    }
}
