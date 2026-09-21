using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Households.Interfaces;
using JxFinance.Endpoints.Households.Shared;

namespace JxFinance.Endpoints.Households.GetHouseholdAudit;

public sealed class GetHouseholdAuditEndpoint(IHouseholdAuditService auditService)
    : Endpoint<GetHouseholdAuditRequest, PagedResponse<AuditEventResponse>>
{
    public override void Configure()
    {
        Get("households/{id}/audit");
        Group<HouseholdsGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(GetHouseholdAuditRequest req, CancellationToken ct)
    {
        var page = (await auditService.GetPageAsync(req, ct)).ValueOrThrow();
        await Send.OkAsync(page, ct);
    }
}
