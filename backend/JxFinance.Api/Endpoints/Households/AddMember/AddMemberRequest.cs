using System.Text.Json.Serialization;
using JxFinance.Domain.Households;

namespace JxFinance.Endpoints.Households.AddMember;

public sealed record AddMemberRequest(Guid Id, string Email, [property: JsonRequired] HouseholdRole Role);
