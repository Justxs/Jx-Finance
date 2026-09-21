namespace JxFinance.Endpoints.Dashboard.SaveDashboardLayout;

public sealed record SaveDashboardLayoutRequest(IReadOnlyList<string> Order, IReadOnlyList<string> Hidden);
