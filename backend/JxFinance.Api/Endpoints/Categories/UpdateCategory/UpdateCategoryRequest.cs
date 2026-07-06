using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Categories.UpdateCategory;

public sealed record UpdateCategoryRequest(Guid Id, string Name, string? Icon, Scope Scope, Guid? HouseholdId);
