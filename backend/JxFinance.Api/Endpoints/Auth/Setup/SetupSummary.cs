using FastEndpoints;

namespace JxFinance.Endpoints.Auth.Setup;

public sealed class SetupSummary : Summary<SetupEndpoint, SetupRequest>
{
    public SetupSummary()
    {
        Summary = "Provision the first administrator";
        Description = "Creates the administrator account on a fresh instance and signs this browser in with a "
            + "session that is not remembered, then marks the guided setup as pending in the settings. It works "
            + "exactly once: once an administrator exists the endpoint answers 409 for good. Rate limited to five "
            + "attempts per five minutes per client.";
        ExampleRequest = new SetupRequest("admin@example.com", "correct horse battery staple", "Admin");
        Responses[200] = "The administrator account was created and signed in; its profile is returned.";
        Responses[400] = "The email or password did not pass validation.";
        Responses[409] = "An administrator already exists; setup is closed.";
        Responses[429] = "Too many setup attempts; wait and retry.";
    }
}
