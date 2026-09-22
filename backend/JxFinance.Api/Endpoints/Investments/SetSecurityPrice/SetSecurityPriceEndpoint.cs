using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Investments.Interfaces;
using JxFinance.Endpoints.Investments.Shared;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Investments.SetSecurityPrice;

public sealed class SetSecurityPriceEndpoint(ISecurityPriceService priceService)
    : Endpoint<SetSecurityPriceRequest, SecurityResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Investments + "/securities/{id:guid}/price");
        Group<InvestmentsGroup>();
        Description(d => d.ProducesProblemDetails(403).ProducesProblemDetails(404).ProducesProblemDetails(409));
    }

    public override async Task HandleAsync(SetSecurityPriceRequest req, CancellationToken ct)
    {
        await Send.OkOrProblemAsync(await priceService.SetPriceAsync(req, User.IsInRole(AppRoles.Admin), ct), ct);
    }
}
