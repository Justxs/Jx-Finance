using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Categories.Shared;

public interface ICategoryInput
{
    string Name { get; }
    string? Icon { get; }
    Scope Scope { get; }
    Guid? HouseholdId { get; }
}
