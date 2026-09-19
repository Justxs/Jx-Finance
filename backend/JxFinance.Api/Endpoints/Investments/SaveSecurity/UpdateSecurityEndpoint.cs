using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Investments.Interfaces;
using JxFinance.Endpoints.Investments.Shared;

namespace JxFinance.Endpoints.Investments.SaveSecurity;

public sealed class UpdateSecurityEndpoint(IInvestmentService investmentService) : Endpoint<SaveSecurityRequest, SecurityResponse>
{
    public override void Configure()
    {
        Put("investments/securities/{id:guid}");
        Group<InvestmentsGroup>();
    }

    public override async Task HandleAsync(SaveSecurityRequest req, CancellationToken ct) =>
        await Send.OkAsync((await investmentService.SaveSecurityAsync(req, ct)).ValueOrThrow(), ct);
}
