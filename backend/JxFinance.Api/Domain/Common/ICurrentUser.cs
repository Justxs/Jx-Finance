using JxFinance.Domain.Households;

namespace JxFinance.Domain.Common;

public interface ICurrentUser
{
    Guid Id { get; }

    HouseholdId? ActiveHouseholdId => null;
}
