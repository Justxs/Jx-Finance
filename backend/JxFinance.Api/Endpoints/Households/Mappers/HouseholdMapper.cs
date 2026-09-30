using JxFinance.Domain.Households;
using JxFinance.Endpoints.Households.CreateHousehold;
using JxFinance.Endpoints.Households.Shared;

namespace JxFinance.Endpoints.Households.Mappers;

public static class HouseholdMapper
{
    public static Household ToEntity(this CreateHouseholdRequest request) => new() { Name = request.Name.Trim() };

    public static void ApplyTo(this IHouseholdInput input, Household household) =>
        household.Name = input.Name.Trim();

    public static HouseholdMemberResponse ToResponse(this HouseholdMembership membership, string? email, string? displayName) => new(
        membership.UserId,
        email ?? "",
        displayName ?? "",
        membership.Role);

    public static HouseholdResponse ToResponse(
        this Household household,
        HouseholdRole myRole,
        IReadOnlyList<HouseholdMemberResponse> members) =>
        new(household.Id.Value, household.Name, myRole, members);
}
