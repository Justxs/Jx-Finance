using JxFinance.Domain.Email;
using JxFinance.Domain.Settings;

namespace JxFinance.Common.Settings;

public sealed record SmtpSettingsSnapshot(
    bool Enabled,
    string? Host,
    int Port,
    SmtpEncryption Encryption,
    string? UserName,
    string ProtectedPassword,
    string? FromAddress,
    string? FromName)
{
    public bool IsConfigured => Enabled
        && !string.IsNullOrWhiteSpace(Host)
        && !string.IsNullOrWhiteSpace(FromAddress)
        && Port is > 0 and <= 65535;

    public bool HasPassword => ProtectedPassword.Length > 0;

    public static SmtpSettingsSnapshot From(InstanceSettings settings) => new(
        settings.SmtpEnabled,
        OptionalText.Normalize(settings.SmtpHost),
        settings.SmtpPort,
        settings.SmtpEncryption,
        OptionalText.Normalize(settings.SmtpUserName),
        settings.SmtpProtectedPassword,
        OptionalText.Normalize(settings.SmtpFromAddress),
        OptionalText.Normalize(settings.SmtpFromName));
}
