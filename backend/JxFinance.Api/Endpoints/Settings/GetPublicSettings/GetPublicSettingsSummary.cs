using FastEndpoints;

namespace JxFinance.Endpoints.Settings.GetPublicSettings;

public sealed class GetPublicSettingsSummary : Summary<GetPublicSettingsEndpoint>
{
    public GetPublicSettingsSummary()
    {
        Summary = "Read the settings the sign-in page needs";
        Description = "Anonymous. Returns only the installation name, the default language, whether this "
            + "installation can send email, which is what decides if the sign-in page offers \"Forgot password\", and "
            + "whether an administrator allowed Discord notifications, which the profile uses to explain its Discord "
            + "section. No host name, no address and no credential is part of the answer.";
        Responses[200] = "The public settings.";
    }
}
