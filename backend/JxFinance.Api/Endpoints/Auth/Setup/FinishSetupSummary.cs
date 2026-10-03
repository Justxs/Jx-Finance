using FastEndpoints;

namespace JxFinance.Endpoints.Auth.Setup;

public sealed class FinishSetupSummary : Summary<FinishSetupEndpoint>
{
    public FinishSetupSummary()
    {
        Summary = "Finish the guided setup";
        Description = "Clears setupPending in the settings, so the client stops opening the guided setup for "
            + "administrators. Skipping the setup calls this too. Calling it again changes nothing.";
        Responses[204] = "The guided setup is finished.";
    }
}
