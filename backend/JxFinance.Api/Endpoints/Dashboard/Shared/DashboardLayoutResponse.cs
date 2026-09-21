using JxFinance.Domain.Dashboard;

namespace JxFinance.Endpoints.Dashboard.Shared;

public sealed record DashboardLayoutResponse(
    IReadOnlyList<DashboardCard> Order,
    IReadOnlyList<DashboardCard> Hidden,
    bool IsDefault);
