using JxFinance.Domain.Common;
using JxFinance.Domain.Households;

namespace JxFinance.Infrastructure.Auth;

public sealed record FixedUser(Guid Id, HouseholdId? ActiveHouseholdId = null) : ICurrentUser;
