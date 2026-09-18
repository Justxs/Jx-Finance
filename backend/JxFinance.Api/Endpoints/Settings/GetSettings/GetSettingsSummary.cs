using FastEndpoints;

namespace JxFinance.Endpoints.Settings.GetSettings;

public sealed class GetSettingsSummary : Summary<GetSettingsEndpoint>
{
    public GetSettingsSummary()
    {
        Summary = "Read installation settings";
        Description = "Every signed-in user can read the settings, because they decide which pages, "
            + "currencies and defaults the client offers. Only administrators can change them.";
        Responses[200] = "The current settings.";
    }
}
