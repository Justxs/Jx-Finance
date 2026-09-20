using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Investments.Interfaces;

namespace JxFinance.Endpoints.Investments.DeleteInvestmentTransaction;

public sealed class DeleteInvestmentTransactionEndpoint(IInvestmentService investmentService) : DeleteEndpoint
{
    public override void Configure()
    {
        Delete("investments/transactions/{id}");
        Group<InvestmentsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    protected override Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken ct) =>
        investmentService.DeleteTransactionAsync(id, ct);
}
