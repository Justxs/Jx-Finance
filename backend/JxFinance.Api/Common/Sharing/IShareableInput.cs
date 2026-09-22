using JxFinance.Domain.Common;

namespace JxFinance.Common.Sharing;

public interface IShareableInput
{
    Scope Scope { get; }
    Guid? HouseholdId { get; }
}
