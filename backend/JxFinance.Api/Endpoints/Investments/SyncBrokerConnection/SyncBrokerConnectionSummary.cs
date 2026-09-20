using FastEndpoints;

namespace JxFinance.Endpoints.Investments.SyncBrokerConnection;

public sealed class SyncBrokerConnectionSummary : Summary<SyncBrokerConnectionEndpoint>
{
    public SyncBrokerConnectionSummary()
    {
        Summary = "Download and import the Flex Query report now";
        Description = "Asks Interactive Brokers to run the stored Flex Query, waits for it, and imports it the same way "
            + "as an uploaded file. Can take up to a minute.";
        Responses[200] = "Counts of what was imported.";
        Responses[400] = "Interactive Brokers rejected the token or query, or the report could not be imported.";
        Responses[404] = "No connection on that account.";
        Responses[409] = "A security in the report kept colliding with one created at the same time. Nothing was imported; retry.";
    }
}
