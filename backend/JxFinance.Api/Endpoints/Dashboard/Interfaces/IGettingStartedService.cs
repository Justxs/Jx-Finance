using JxFinance.Endpoints.Dashboard.Shared;

namespace JxFinance.Endpoints.Dashboard.Interfaces;

public interface IGettingStartedService
{
    Task<IReadOnlyList<GettingStartedStepResponse>> GetAsync(Guid userId, bool isAdmin, CancellationToken cancellationToken);
}
