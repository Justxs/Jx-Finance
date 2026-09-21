using FastEndpoints;

namespace JxFinance.Endpoints.Dashboard.SaveDashboardLayout;

public sealed class SaveDashboardLayoutSummary : Summary<SaveDashboardLayoutEndpoint, SaveDashboardLayoutRequest>
{
    public SaveDashboardLayoutSummary()
    {
        Summary = "Save your dashboard layout";
        Description = "Stores the order of the dashboard cards and which of them are hidden, for the signed-in user only; "
            + "household members each keep their own. Cards left out of the order are placed after the listed ones in "
            + "their default order. A card whose feature switch is off keeps its place and comes back there when the "
            + "feature is switched on again.";
        ExampleRequest = new SaveDashboardLayoutRequest(["accounts", "summary", "monthlyTrend"], ["netWorth"]);
        RequestParam(
            r => r.Order,
            "Card ids from first to last: summary, monthlyTrend, spendingByCategory, spendingPace, budgets, netWorth, "
                + "accounts, recentTransactions, upcomingBills. Each at most once.");
        RequestParam(r => r.Hidden, "Card ids the dashboard neither shows nor loads. Each at most once.");
        Responses[200] = "The saved layout with every card in its resolved position.";
        Responses[400] = "Validation failed: dashboard.cardUnknown or dashboard.cardDuplicate.";
    }
}
