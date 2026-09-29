using FastEndpoints;
using JxFinance.Domain.Settings;

namespace JxFinance.Endpoints.Users.UpdateMyLanguage;

public sealed class UpdateMyLanguageSummary : Summary<UpdateMyLanguageEndpoint, UpdateMyLanguageRequest>
{
    public UpdateMyLanguageSummary()
    {
        Summary = "Save your language";
        Description = "Saves the language you picked in the interface, en or lt, so that every email and Discord message "
            + "the server sends you is written in it. Until you save one, messages use the installation's default "
            + "language. The interface itself keeps its language per browser.";
        ExampleRequest = new UpdateMyLanguageRequest(AppLanguages.Lt);
        Responses[200] = "Your profile with the saved language.";
        Responses[400] = "Validation failed: the language is not en or lt.";
        Responses[429] = "Too many changes from this client; wait and retry.";
    }
}
