using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Investments.Interfaces;
using JxFinance.Endpoints.Investments.Shared;

namespace JxFinance.Endpoints.Investments.GetSecurities;

public sealed class GetSecuritiesEndpoint(IInvestmentService investmentService)
    : Endpoint<GetSecuritiesRequest, IReadOnlyList<SecurityResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.Investments + "/securities");
        Group<InvestmentsGroup>();
    }

    public override async Task HandleAsync(GetSecuritiesRequest req, CancellationToken ct) =>
        await Send.OkAsync(await investmentService.GetSecuritiesAsync(req, ct), ct);
}
