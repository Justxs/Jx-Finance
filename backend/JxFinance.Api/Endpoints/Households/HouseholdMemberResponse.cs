using JxFinance.Domain.Households;

namespace JxFinance.Endpoints.Households;

public sealed record HouseholdMemberResponse(Guid UserId, string Email, string DisplayName, HouseholdRole Role);
