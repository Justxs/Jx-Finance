using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Investments.Interfaces;
using JxFinance.Endpoints.Investments.Shared;

namespace JxFinance.Endpoints.Investments.SaveSecurity;

public sealed class CreateSecurityEndpoint(IInvestmentService investmentService) : Endpoint<SaveSecurityRequest, SecurityResponse>
{
    public override void Configure()
    {
        Post("investments/securities");
        Group<InvestmentsGroup>();
    }

    public override async Task HandleAsync(SaveSecurityRequest req, CancellationToken ct) =>
        await Send.OkAsync((await investmentService.CreateSecurityAsync(req, ct)).ValueOrThrow(), ct);
}
