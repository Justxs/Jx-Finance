using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Investments.Interfaces;
using JxFinance.Endpoints.Investments.Shared;

namespace JxFinance.Endpoints.Investments.GetSecurityPrices;

public sealed class GetSecurityPricesEndpoint(ISecurityPriceService priceService)
    : Endpoint<GetSecurityPricesRequest, IReadOnlyList<SecurityPriceResponse>>
{
    public override void Configure()
    {
        Get(ApiRoutes.Investments + "/securities/{id:guid}/prices");
        Group<InvestmentsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(GetSecurityPricesRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await priceService.GetPricesAsync(req, ct), ct);
}
