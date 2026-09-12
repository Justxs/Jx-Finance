using FastEndpoints;

namespace JxFinance.Endpoints.Auth.Setup;

public sealed class GetSetupStatusSummary : Summary<GetSetupStatusEndpoint>
{
    public GetSetupStatusSummary()
    {
        Summary = "Check whether first-run setup is needed";
        Description = "Reports whether the instance still has no administrator. The client calls this "
            + "before choosing between the setup screen and the login screen. It stays callable without "
            + "a session and discloses nothing beyond the single flag.";
        Responses[200] = "needsSetup is true while no administrator exists.";
    }
}
