using FastEndpoints;
using JxFinance.Domain.Dashboard;
using JxFinance.Endpoints.Dashboard.Interfaces;
using JxFinance.Endpoints.Dashboard.SaveDashboardLayout;
using JxFinance.Endpoints.Dashboard.Shared;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Dashboard.Services;

[RegisterService<IDashboardLayoutService>(LifeTime.Scoped)]
public sealed class DashboardLayoutService(AppDbContext db) : IDashboardLayoutService
{
    public async Task<DashboardLayoutResponse> GetAsync(Guid userId, CancellationToken cancellationToken)
    {
        var layout = await db.Users
            .Where(u => u.Id == userId)
            .Select(u => u.DashboardLayout)
            .FirstOrDefaultAsync(cancellationToken);

        return ToResponse(layout);
    }

    public async Task<DashboardLayoutResponse> SaveAsync(
        Guid userId,
        SaveDashboardLayoutRequest request,
        CancellationToken cancellationToken)
    {
        var requested = new DashboardLayout(request.Order, request.Hidden);
        var layout = DashboardLayout.From(requested.ResolvedOrder(), requested.ResolvedHidden());
        await StoreAsync(userId, layout, cancellationToken);
        return ToResponse(layout);
    }

    public async Task<DashboardLayoutResponse> ResetAsync(Guid userId, CancellationToken cancellationToken)
    {
        await StoreAsync(userId, null, cancellationToken);
        return ToResponse(null);
    }

    private Task<int> StoreAsync(Guid userId, DashboardLayout? layout, CancellationToken cancellationToken) =>
        db.Users
            .Where(u => u.Id == userId)
            .ExecuteUpdateAsync(setters => setters.SetProperty(u => u.DashboardLayout, layout), cancellationToken);

    private static DashboardLayoutResponse ToResponse(DashboardLayout? layout) =>
        layout is null
            ? new DashboardLayoutResponse(DashboardLayout.DefaultOrder, [], true)
            : new DashboardLayoutResponse(layout.ResolvedOrder(), layout.ResolvedHidden(), false);
}
