using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Tags.Shared;

public interface ITagInput
{
    string Name { get; }
    Scope Scope { get; }
    Guid? HouseholdId { get; }
}
