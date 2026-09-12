using FastEndpoints;

namespace JxFinance.Endpoints.Ping.GetPing;

public sealed class GetPingSummary : Summary<GetPingEndpoint>
{
    public GetPingSummary()
    {
        Summary = "Ping the API";
        Description = "Answers with a fixed message and the server time in UTC. It touches no database "
            + "and needs no session, so it checks that the process is up and serving. For a check that "
            + "includes the database, use /health instead.";
        Responses[200] = "The API is serving requests.";
    }
}
