using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Investments.Interfaces;
using JxFinance.Endpoints.Investments.Shared;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Investments.SaveSecurity;

public sealed class CreateSecurityEndpoint(IInvestmentService investmentService) : Endpoint<SaveSecurityRequest, SecurityResponse>
{
    public override void Configure()
    {
        Post(ApiRoutes.Investments + "/securities");
        Group<InvestmentsGroup>();
        Description(d => d.ProducesProblemDetails(403));
    }

    public override async Task HandleAsync(SaveSecurityRequest req, CancellationToken ct) =>
        await Send.OkOrProblemAsync(await investmentService.CreateSecurityAsync(req, User.IsInRole(AppRoles.Admin), ct), ct);
}
