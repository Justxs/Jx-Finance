using FastEndpoints;

namespace JxFinance.Endpoints.Auth.Setup;

public sealed class RemoveDemoDataSummary : Summary<RemoveDemoDataEndpoint>
{
    public RemoveDemoDataSummary()
    {
        Summary = "Remove the demo data and start for real";
        Description = "Empties every ledger table, including anything entered since the demo data was loaded, gives the "
            + "administrator the starter categories again and clears demoData. Users, sign-in data, sessions, settings "
            + "and exchange rates stay. Allowed only while demoData is set and the administrator is the only user; "
            + "otherwise it answers 409 setup.demoNotRemovable.";
        Responses[204] = "The demo data is removed.";
        Responses[409] = "No demo data is loaded, or another user exists.";
    }
}
