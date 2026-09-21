using JxFinance.Domain.Email;

namespace JxFinance.Common.Email;

public sealed record SmtpDelivery(
    string Host,
    int Port,
    SmtpEncryption Encryption,
    string? UserName,
    string? Password,
    string FromAddress,
    string FromName);
