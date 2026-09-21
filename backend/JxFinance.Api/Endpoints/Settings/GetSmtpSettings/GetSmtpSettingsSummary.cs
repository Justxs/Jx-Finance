using FastEndpoints;

namespace JxFinance.Endpoints.Settings.GetSmtpSettings;

public sealed class GetSmtpSettingsSummary : Summary<GetSmtpSettingsEndpoint>
{
    public GetSmtpSettingsSummary()
    {
        Summary = "Read the mail server of this installation";
        Description = "Answers the SMTP host, port, encryption mode, user name, sender address and sender name, plus "
            + "the enabled switch. The password is never part of the answer; hasPassword says only whether one is "
            + "stored. Administrators only, unlike GET /api/settings, because these values describe an outside system.";
        Responses[200] = "The stored mail server settings, without the password.";
        Responses[403] = "Only administrators can read the mail server settings.";
    }
}
