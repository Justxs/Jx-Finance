using JxFinance.Domain.Common;
using JxFinance.Endpoints.Households.AddMember;
using JxFinance.Endpoints.Households.CreateHousehold;
using JxFinance.Endpoints.Households.UpdateHousehold;
using JxFinance.Endpoints.Households.UpdateMemberRole;

namespace JxFinance.Endpoints.Households;

public interface IHouseholdService
{
    Task<IReadOnlyList<HouseholdResponse>> GetAllAsync(CancellationToken cancellationToken);

    Task<Result<HouseholdResponse>> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    Task<HouseholdResponse> CreateAsync(CreateHouseholdRequest request, CancellationToken cancellationToken);

    Task<Result<HouseholdResponse>> UpdateAsync(UpdateHouseholdRequest request, CancellationToken cancellationToken);

    Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken);

    Task<Result<HouseholdResponse>> AddMemberAsync(AddMemberRequest request, CancellationToken cancellationToken);

    Task<Result<HouseholdResponse>> UpdateMemberRoleAsync(
        UpdateMemberRoleRequest request,
        CancellationToken cancellationToken);

    Task<Result<HouseholdResponse>> RemoveMemberAsync(
        Guid householdId,
        Guid userId,
        CancellationToken cancellationToken);
}
