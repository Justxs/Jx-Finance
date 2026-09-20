using FastEndpoints;
using JxFinance.Domain.Households;
using JxFinance.Endpoints.Households.CreateHousehold;
using JxFinance.Endpoints.Households.Shared;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Households.Mappers;

[RegisterService<HouseholdMapper>(LifeTime.Singleton)]
public sealed class HouseholdMapper : Mapper<CreateHouseholdRequest, HouseholdResponse, Household>
{
    public override Household ToEntity(CreateHouseholdRequest request) => new() { Name = request.Name.Trim() };

    public void Apply(IHouseholdInput input, Household household) =>
        household.Name = input.Name.Trim();

    public HouseholdMemberResponse ToMember(HouseholdMembership membership, AppUser? user) => new(
        membership.UserId,
        user?.Email ?? "",
        user?.DisplayName ?? "",
        membership.Role);

    public HouseholdResponse FromEntity(
        Household household,
        HouseholdRole myRole,
        IReadOnlyList<HouseholdMemberResponse> members) =>
        new(household.Id.Value, household.Name, myRole, members);
}
