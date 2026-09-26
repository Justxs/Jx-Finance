using JxFinance.Common;
using JxFinance.Domain.Audit;

namespace JxFinance.Endpoints.Households.GetHouseholdAudit;

public sealed class GetHouseholdAuditRequest : PagedRequest
{
    public Guid Id { get; init; }

    public Guid? MemberId { get; init; }

    public AuditEntityKind? Kind { get; init; }

    public DateOnly? DateFrom { get; init; }

    public DateOnly? DateTo { get; init; }
}
