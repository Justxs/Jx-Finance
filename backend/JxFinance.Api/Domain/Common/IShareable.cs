using JxFinance.Domain.Households;

namespace JxFinance.Domain.Common;

public interface IShareable
{
    Scope Scope { get; set; }

    HouseholdId? HouseholdId { get; set; }
}
