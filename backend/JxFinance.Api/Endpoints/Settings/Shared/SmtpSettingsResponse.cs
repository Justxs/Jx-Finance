using JxFinance.Domain.Email;

namespace JxFinance.Endpoints.Settings.Shared;

public sealed record SmtpSettingsResponse(
    bool Enabled,
    string? Host,
    int Port,
    SmtpEncryption Encryption,
    string? UserName,
    bool HasPassword,
    string? FromAddress,
    string? FromName);
