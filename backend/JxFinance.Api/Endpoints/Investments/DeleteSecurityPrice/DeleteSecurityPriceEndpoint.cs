using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Investments.Interfaces;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Investments.DeleteSecurityPrice;

public sealed class DeleteSecurityPriceEndpoint(ISecurityPriceService priceService) : Endpoint<DeleteSecurityPriceRequest>
{
    public override void Configure()
    {
        Delete(ApiRoutes.Investments + "/securities/{id:guid}/prices/{date}");
        Group<InvestmentsGroup>();
        Description(d => d.ProducesProblemDetails(403).ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(DeleteSecurityPriceRequest req, CancellationToken ct)
    {
        (await priceService.DeletePriceAsync(req, User.IsInRole(AppRoles.Admin), ct)).EnsureSuccess();
        await Send.NoContentAsync(ct);
    }
}
