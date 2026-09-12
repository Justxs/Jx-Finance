using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Categories.Shared;

public sealed record CategoryResponse(
    Guid Id,
    string Name,
    FlowType Type,
    string? Icon,
    bool IsDefault,
    Scope Scope,
    Guid? HouseholdId);
