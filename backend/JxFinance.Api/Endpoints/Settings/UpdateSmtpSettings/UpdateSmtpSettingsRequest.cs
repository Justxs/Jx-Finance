using System.Globalization;
using System.Text;
using JxFinance.Common;
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
    string? FromName)
{
    private bool PrintMembers(StringBuilder builder)
    {
        builder.Append(
            CultureInfo.InvariantCulture,
            $"Enabled = {Enabled}, Host = {Host}, Port = {Port}, Encryption = {Encryption}, UserName = {UserName}, "
            + $"Password = {SecretText.Hidden}, FromAddress = {FromAddress}, FromName = {FromName}");
        return true;
    }
}
