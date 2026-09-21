using JxFinance.Common;
using JxFinance.Domain.Audit;

namespace JxFinance.Endpoints.Households.GetHouseholdAudit;

public sealed class GetHouseholdAuditRequest : IPagedRequest
{
    public Guid Id { get; init; }

    public int Page { get; init; } = 1;

    public int PageSize { get; init; } = 20;

    public Guid? MemberId { get; init; }

    public AuditEntityKind? Kind { get; init; }

    public DateOnly? DateFrom { get; init; }

    public DateOnly? DateTo { get; init; }
}
