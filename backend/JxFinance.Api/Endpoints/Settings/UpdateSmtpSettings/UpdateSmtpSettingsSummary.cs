using FastEndpoints;
using JxFinance.Domain.Email;

namespace JxFinance.Endpoints.Settings.UpdateSmtpSettings;

public sealed class UpdateSmtpSettingsSummary : Summary<UpdateSmtpSettingsEndpoint, UpdateSmtpSettingsRequest>
{
    public UpdateSmtpSettingsSummary()
    {
        Summary = "Save the mail server of this installation";
        Description = "Stores the SMTP host, port, encryption mode, optional user name and password, and the sender "
            + "address and name, on the single installation settings row. The password is encrypted with ASP.NET Data "
            + "Protection before it is stored and is never returned: the response carries hasPassword instead. Leaving "
            + "password empty keeps the stored one; clearing the user name clears the stored password with it, because "
            + "an anonymous relay has nothing to authenticate. Switching enabled on needs a host and a sender address. "
            + "Administrators only.";
        ExampleRequest = new UpdateSmtpSettingsRequest(
            true,
            "smtp.example.com",
            587,
            SmtpEncryption.StartTls,
            "finance@example.com",
            "app-password",
            "finance@example.com",
            "Jx Finance");
        RequestParam(r => r.Password, "Leave empty to keep the stored password.");
        RequestParam(r => r.Encryption, "none, startTls or sslOnConnect.");
        Responses[200] = "The saved settings, without the password.";
        Responses[403] = "Only administrators can change installation settings.";
    }
}
