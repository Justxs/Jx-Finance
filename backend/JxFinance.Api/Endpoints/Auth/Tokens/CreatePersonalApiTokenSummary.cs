using FastEndpoints;

namespace JxFinance.Endpoints.Auth.Tokens;

public sealed class CreatePersonalApiTokenSummary : Summary<CreatePersonalApiTokenEndpoint, CreatePersonalApiTokenRequest>
{
    public CreatePersonalApiTokenSummary()
    {
        Summary = "Create a personal API token";
        Description = "Confirms the account password and creates a read-only token for scripts and spreadsheets. "
            + "The token is returned once, in this response, and never again: only its public prefix and a hash of "
            + "its secret are kept. Send it as Authorization: Bearer jxp_... to read what you read in the browser. "
            + "It cannot write anything and cannot reach administration, sessions, tokens, settings, backups or "
            + "attachments. The password counts toward the account lockout. Needs the ApiTokens feature switch. "
            + "Rate limited to five attempts per five minutes.";
        ExampleRequest = new CreatePersonalApiTokenRequest("Monthly spreadsheet", 90, "correct horse battery staple");
        RequestParam(r => r.Name, "A name for the list, at most 60 characters.");
        RequestParam(r => r.ExpiresInDays, "Days until the token stops working, from 1 to 365.");
        RequestParam(r => r.Password, "The account password.");
        Responses[201] = "The token was created; the response holds the secret, once.";
        Responses[400] = "Validation failed, or the password was wrong (password.incorrect).";
        Responses[404] = "The ApiTokens feature is off (feature.disabled), or the session points at a user that no longer exists.";
        Responses[409] = "The account already holds ten tokens that have not expired (token.limitReached).";
        Responses[429] = "Too many attempts, or the account is locked after repeated failures.";
    }
}
