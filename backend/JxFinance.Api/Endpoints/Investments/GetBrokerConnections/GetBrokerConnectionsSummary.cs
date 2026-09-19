using FastEndpoints;

namespace JxFinance.Endpoints.Investments.GetBrokerConnections;

public sealed class GetBrokerConnectionsSummary : Summary<GetBrokerConnectionsEndpoint>
{
    public GetBrokerConnectionsSummary()
    {
        Summary = "List your Interactive Brokers connections";
        Description = "One connection per account. The Flex token is write-only and never returned.";
        Responses[200] = "Your connections with the time and outcome of the last sync.";
    }
}
