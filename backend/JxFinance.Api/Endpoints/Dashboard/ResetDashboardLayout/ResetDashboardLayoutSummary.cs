using FastEndpoints;

namespace JxFinance.Endpoints.Dashboard.ResetDashboardLayout;

public sealed class ResetDashboardLayoutSummary : Summary<ResetDashboardLayoutEndpoint>
{
    public ResetDashboardLayoutSummary()
    {
        Summary = "Reset your dashboard layout";
        Description = "Forgets the saved layout of the signed-in user, so the dashboard shows every card in the default "
            + "order again. The layouts of other users are untouched. Safe to repeat.";
        Responses[200] = "The default layout.";
    }
}
