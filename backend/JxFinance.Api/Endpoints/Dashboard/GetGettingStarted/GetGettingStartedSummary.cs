using FastEndpoints;

namespace JxFinance.Endpoints.Dashboard.GetGettingStarted;

public sealed class GetGettingStartedSummary : Summary<GetGettingStartedEndpoint>
{
    public GetGettingStartedSummary()
    {
        Summary = "Get your getting started steps";
        Description = "Returns the first steps through the application in order, each marked done or not. Every "
            + "step is worked out from your data at the time of the request, so nothing is stored: deleting your only "
            + "budget marks planning as not done again. A step whose feature is switched off is left out; inviting a "
            + "member, setting up email and taking a backup are listed for administrators only. Sorting your spending "
            + "is done once you have a transaction and none dated in the last 30 days is uncategorized.";
        Responses[200] = "The steps of the signed-in user.";
    }
}
