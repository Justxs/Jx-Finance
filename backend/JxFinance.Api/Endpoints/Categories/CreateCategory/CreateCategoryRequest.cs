using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Categories.CreateCategory;

public sealed record CreateCategoryRequest(string Name, FlowType Type, string? Icon, Scope Scope, Guid? HouseholdId);
