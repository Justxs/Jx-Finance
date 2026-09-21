using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Households.GetHouseholdAudit;
using JxFinance.Endpoints.Households.Shared;

namespace JxFinance.Endpoints.Households.Interfaces;

public interface IHouseholdAuditService
{
    Task<Result<PagedResponse<AuditEventResponse>>> GetPageAsync(
        GetHouseholdAuditRequest request,
        CancellationToken cancellationToken);
}
