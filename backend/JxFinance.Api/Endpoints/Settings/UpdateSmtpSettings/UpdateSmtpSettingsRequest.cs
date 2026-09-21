using JxFinance.Domain.Email;

namespace JxFinance.Endpoints.Settings.UpdateSmtpSettings;

public sealed record UpdateSmtpSettingsRequest(
    bool Enabled,
    string? Host,
    int Port,
    SmtpEncryption Encryption,
    string? UserName,
    string? Password,
    string? FromAddress,
    string? FromName);
