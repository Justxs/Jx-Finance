using FastEndpoints;

namespace JxFinance.Endpoints.Settings.GetPublicSettings;

public sealed class GetPublicSettingsSummary : Summary<GetPublicSettingsEndpoint>
{
    public GetPublicSettingsSummary()
    {
        Summary = "Read the settings the sign-in page needs";
        Description = "Anonymous. Returns only the installation name and the default language.";
        Responses[200] = "The public settings.";
    }
}
