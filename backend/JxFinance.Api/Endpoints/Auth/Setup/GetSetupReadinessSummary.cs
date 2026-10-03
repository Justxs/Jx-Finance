using FastEndpoints;

namespace JxFinance.Endpoints.Auth.Setup;

public sealed class GetSetupReadinessSummary : Summary<GetSetupReadinessEndpoint>
{
    public GetSetupReadinessSummary()
    {
        Summary = "Read what this server can run";
        Description = "Tells the guided setup which optional parts are installed where the API runs, whatever the "
            + "feature switches say: receiptReaderInstalled is true when Tesseract is available for receipt reading.";
        Responses[200] = "What the server has installed.";
    }
}
