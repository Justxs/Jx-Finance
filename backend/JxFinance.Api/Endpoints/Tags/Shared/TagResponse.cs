using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Tags.Shared;

public sealed record TagResponse(Guid Id, string Name, Scope Scope, Guid? HouseholdId);
