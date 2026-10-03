using FastEndpoints;

namespace JxFinance.Endpoints.Settings.GetPublicSettings;

public sealed class GetPublicSettingsSummary : Summary<GetPublicSettingsEndpoint>
{
    public GetPublicSettingsSummary()
    {
        Summary = "Read the settings the sign-in page needs";
        Description = "Anonymous. Returns only the installation name, the default language, whether this "
            + "installation can send email, which is what decides if the sign-in page offers \"Forgot password\", and "
            + "whether the installation's Discord channel and Telegram group are set up, which decide the profile's "
            + "notification columns, and whether passkeys can work here, which is false when the configured site address is plain "
            + "HTTP or an IP address. No host name, no address and no credential is part of the answer.";
        Responses[200] = "The public settings.";
    }
}
