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
            + "password empty keeps the stored one, but only while the host and the user name stay the same: changing "
            + "either without a new password answers 400 email.passwordRequired, so a saved password is never sent to "
            + "another server or account. Clearing the user name clears the stored password with it, because an "
            + "anonymous relay has nothing to authenticate. A user name needs startTls or sslOnConnect: none with a user "
            + "name answers 400 email.insecureConnection, because credentials are never sent in plain text. Switching "
            + "enabled on needs a host and a sender address. Administrators only.";
        ExampleRequest = new UpdateSmtpSettingsRequest(
            true,
            "smtp.example.com",
            587,
            SmtpEncryption.StartTls,
            "finance@example.com",
            "app-password",
            "finance@example.com",
            "Jx Finance");
        RequestParam(r => r.Password, "Leave empty to keep the stored password; required when the host or user name changes.");
        RequestParam(
            r => r.Encryption,
            "startTls (the default, usually port 587; the server must offer STARTTLS), sslOnConnect (usually port 465) "
            + "or none, which is only accepted without a user name.");
        Responses[400] = "Invalid settings, email.insecureConnection, or email.passwordRequired.";
        Responses[200] = "The saved settings, without the password.";
        Responses[403] = "Only administrators can change installation settings.";
    }
}
