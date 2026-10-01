namespace JxFinance.Endpoints.Users.UpdateMyDigestScopes;

public sealed record UpdateMyDigestScopesRequest(bool Everything, IReadOnlyList<Guid> HouseholdIds);
