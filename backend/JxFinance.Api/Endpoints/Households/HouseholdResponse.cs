using JxFinance.Domain.Households;

namespace JxFinance.Endpoints.Households;

public sealed record HouseholdResponse(
    Guid Id,
    string Name,
    HouseholdRole MyRole,
    IReadOnlyList<HouseholdMemberResponse> Members);
