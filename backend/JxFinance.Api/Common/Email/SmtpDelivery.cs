using System.Globalization;
using System.Text;
using JxFinance.Domain.Email;

namespace JxFinance.Common.Email;

public sealed record SmtpDelivery(
    string Host,
    int Port,
    SmtpEncryption Encryption,
    string? UserName,
    string? Password,
    string FromAddress,
    string FromName)
{
    private bool PrintMembers(StringBuilder builder)
    {
        builder.Append(
            CultureInfo.InvariantCulture,
            $"Host = {Host}, Port = {Port}, Encryption = {Encryption}, UserName = {UserName}, "
            + $"Password = {SecretText.Hidden}, FromAddress = {FromAddress}, FromName = {FromName}");
        return true;
    }
}
