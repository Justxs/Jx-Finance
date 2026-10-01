using JxFinance.Domain.Common;
using JxFinance.Endpoints.Investments.SaveAllocationTargets;
using JxFinance.Endpoints.Investments.Shared;

namespace JxFinance.Endpoints.Investments.Interfaces;

public interface IAllocationTargetService
{
    Task<AllocationTargetsResponse> GetAsync(CancellationToken cancellationToken);

    Task<Result<AllocationTargetsResponse>> SaveAsync(SaveAllocationTargetsRequest request, CancellationToken cancellationToken);
}
