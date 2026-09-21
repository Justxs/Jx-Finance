using FastEndpoints;

namespace JxFinance.Endpoints.Dashboard.GetDashboardLayout;

public sealed class GetDashboardLayoutSummary : Summary<GetDashboardLayoutEndpoint>
{
    public GetDashboardLayoutSummary()
    {
        Summary = "Get your dashboard layout";
        Description = "Returns the order of every dashboard card and the ones you hid. Without a saved layout this is "
            + "the default order with nothing hidden and isDefault true. Card ids a saved layout holds but this version "
            + "does not know are dropped, and cards the saved layout does not mention follow the saved ones in their "
            + "default order. Feature switches are not applied here: the client leaves out a card whose feature is off.";
        Responses[200] = "The layout of the signed-in user.";
    }
}
