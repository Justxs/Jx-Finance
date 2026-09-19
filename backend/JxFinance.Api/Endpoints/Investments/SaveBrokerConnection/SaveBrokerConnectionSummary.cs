using FastEndpoints;

namespace JxFinance.Endpoints.Investments.SaveBrokerConnection;

public sealed class SaveBrokerConnectionSummary : Summary<SaveBrokerConnectionEndpoint, SaveBrokerConnectionRequest>
{
    public SaveBrokerConnectionSummary()
    {
        Summary = "Connect an account to the Interactive Brokers Flex Web Service";
        Description = "Stores the Flex Query id and token so the server can download the report once a day and on "
            + "demand. The token is encrypted at rest. Leave Token empty to keep the stored one.";
        RequestParam(r => r.Token, "Required the first time; optional afterwards.");
        Responses[200] = "The saved connection.";
        Responses[400] = "Validation failed or the account is not yours.";
    }
}
