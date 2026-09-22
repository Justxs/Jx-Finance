using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Investments.Interfaces;
using JxFinance.Endpoints.Investments.Shared;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Investments.SaveSecurity;

public sealed class UpdateSecurityEndpoint(IInvestmentService investmentService) : Endpoint<SaveSecurityRequest, SecurityResponse>
{
    public override void Configure()
    {
        Put(ApiRoutes.Investments + "/securities/{id:guid}");
        Group<InvestmentsGroup>();
        Roles(AppRoles.Admin);
        Description(d => d.ProducesProblemDetails(403).ProducesProblemDetails(404).ProducesProblemDetails(409));
    }

    public override async Task HandleAsync(SaveSecurityRequest req, CancellationToken ct) =>
        await Send.OkAsync((await investmentService.UpdateSecurityAsync(req, ct)).ValueOrThrow(), ct);
}
