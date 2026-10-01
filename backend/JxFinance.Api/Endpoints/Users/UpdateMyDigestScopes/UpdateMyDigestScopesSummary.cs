using FastEndpoints;

namespace JxFinance.Endpoints.Users.UpdateMyDigestScopes;

public sealed class UpdateMyDigestScopesSummary : Summary<UpdateMyDigestScopesEndpoint, UpdateMyDigestScopesRequest>
{
    public UpdateMyDigestScopesSummary()
    {
        Summary = "Choose which scopes get a monthly digest";
        Description = "Replaces the scopes your monthly digest covers, for email and Discord alike: everything, the "
            + "default, which is your own records and everything shared into any of your households, and each "
            + "household listed, whose digest reads the month as the dashboard does with that household picked. Each "
            + "chosen scope is its own message. The digest is still sent only when you tick it for email or Discord, "
            + "and nothing is sent when no scope is chosen.";
        ExampleRequest = new UpdateMyDigestScopesRequest(true, [Guid.Parse("8d3c1e52-7a1f-4f53-9f2a-1b6c4e0d9a10")]);
        Responses[200] = "Your profile with the saved digest scopes.";
        Responses[400] = "Validation failed: a household is listed twice (collection.invalidSize) or you are not a member of it (household.notMember).";
        Responses[429] = "Too many changes from this client; wait and retry.";
    }
}
