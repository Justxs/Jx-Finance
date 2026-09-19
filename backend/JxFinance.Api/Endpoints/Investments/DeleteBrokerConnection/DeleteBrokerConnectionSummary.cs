using FastEndpoints;

namespace JxFinance.Endpoints.Investments.DeleteBrokerConnection;

public sealed class DeleteBrokerConnectionSummary : Summary<DeleteBrokerConnectionEndpoint>
{
    public DeleteBrokerConnectionSummary()
    {
        Summary = "Remove an Interactive Brokers connection";
        Description = "Forgets the token and stops automatic sync. Imported entries stay.";
        Responses[204] = "Removed.";
        Responses[404] = "No connection on that account.";
    }
}
