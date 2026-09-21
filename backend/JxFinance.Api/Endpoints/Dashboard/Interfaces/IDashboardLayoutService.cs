using JxFinance.Endpoints.Dashboard.SaveDashboardLayout;
using JxFinance.Endpoints.Dashboard.Shared;

namespace JxFinance.Endpoints.Dashboard.Interfaces;

public interface IDashboardLayoutService
{
    Task<DashboardLayoutResponse> GetAsync(Guid userId, CancellationToken cancellationToken);

    Task<DashboardLayoutResponse> SaveAsync(Guid userId, SaveDashboardLayoutRequest request, CancellationToken cancellationToken);

    Task<DashboardLayoutResponse> ResetAsync(Guid userId, CancellationToken cancellationToken);
}
