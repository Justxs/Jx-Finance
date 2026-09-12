using FastEndpoints;

namespace JxFinance.Endpoints.Auth.Login;

public sealed class LoginSummary : Summary<LoginEndpoint, LoginRequest>
{
    public LoginSummary()
    {
        Summary = "Sign in";
        Description = "Exchanges an email and password for a session cookie. When the account has "
            + "two-factor authentication enabled and no code is supplied, the response is 200 with "
            + "twoFactorRequired set and no cookie issued; repeat the call with twoFactorCode filled in. "
            + "The code may be a six-digit authenticator code or an unused recovery code. "
            + "Rate limited to 10 attempts per five minutes per client.";
        ExampleRequest = new LoginRequest("you@example.com", "correct horse battery staple", false, null);
        RequestParam(r => r.RememberMe, "Keeps the session for 30 days instead of one day.");
        RequestParam(r => r.TwoFactorCode, "Authenticator or recovery code; omit on the first call.");
        Responses[200] = "Signed in, or a second factor is required. Check twoFactorRequired.";
        Responses[401] = "The credentials or the authenticator code were rejected.";
        Responses[429] = "Too many sign-in attempts; wait and retry.";
    }
}
