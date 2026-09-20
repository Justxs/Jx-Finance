using System.Text.Json.Serialization;
using JxFinance.Domain.Households;

namespace JxFinance.Endpoints.Households.UpdateMemberRole;

public sealed record UpdateMemberRoleRequest(Guid Id, Guid UserId, [property: JsonRequired] HouseholdRole Role);
