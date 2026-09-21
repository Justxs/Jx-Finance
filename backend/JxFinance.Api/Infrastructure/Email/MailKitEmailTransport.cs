using JxFinance.Common.Email;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Domain.Email;
using JxFinance.Infrastructure.Configuration;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using MimeKit.Text;

namespace JxFinance.Infrastructure.Email;

public sealed class MailKitEmailTransport(IOptions<AppOptions> options, ILogger<MailKitEmailTransport> logger)
    : IEmailTransport
{
    public async Task<Result> SendAsync(
        SmtpDelivery delivery,
        OutgoingEmail email,
        CancellationToken cancellationToken)
    {
        var message = new MimeMessage();
        try
        {
            message.From.Add(new MailboxAddress(delivery.FromName, delivery.FromAddress));
            message.To.Add(new MailboxAddress(email.ToName, email.ToAddress));
        }
        catch (ParseException)
        {
            return new DomainError(ErrorCodes.EmailSendFailed, "The sender or recipient address is not a valid email address.");
        }

        message.Subject = email.Subject;
        message.Body = new TextPart(TextFormat.Plain) { Text = email.Body };

        using var client = new SmtpClient
        {
            Timeout = Math.Max(options.Value.Email.SendTimeoutSeconds, 1) * 1000,
        };

        try
        {
            await client.ConnectAsync(delivery.Host, delivery.Port, SecurityFor(delivery.Encryption), cancellationToken);
            if (!string.IsNullOrWhiteSpace(delivery.UserName))
            {
                await client.AuthenticateAsync(delivery.UserName, delivery.Password ?? string.Empty, cancellationToken);
            }

            await client.SendAsync(message, cancellationToken);
            await client.DisconnectAsync(quit: true, cancellationToken);
            return Result.Success();
        }
        catch (Exception ex) when (ex is SmtpCommandException
            or SmtpProtocolException
            or AuthenticationException
            or SslHandshakeException
            or System.Net.Sockets.SocketException
            or IOException
            or TimeoutException
            or InvalidOperationException)
        {
            logger.LogWarning(ex, "Sending mail through {Host}:{Port} failed.", delivery.Host, delivery.Port);
            return new DomainError(ErrorCodes.EmailSendFailed, Describe(ex));
        }
    }

    private static SecureSocketOptions SecurityFor(SmtpEncryption encryption) => encryption switch
    {
        SmtpEncryption.SslOnConnect => SecureSocketOptions.SslOnConnect,
        SmtpEncryption.StartTls => SecureSocketOptions.StartTls,
        _ => SecureSocketOptions.None,
    };

    private static string Describe(Exception exception)
    {
        var message = exception.Message.Trim();
        return message.Length > EmailMessage.ErrorMaxLength ? message[..EmailMessage.ErrorMaxLength] : message;
    }
}
